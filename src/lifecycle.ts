import { EventEmitter } from "stream";
import * as vscode from "vscode";

export class Lifecycle {
  private subscriptions: vscode.Disposable[] = [];
  private childLifecycles: Lifecycle[] = [];
  private cancelEmitter = new vscode.EventEmitter<void>();
  private cancelled = false;
  public onCancel = this.cancelEmitter.event;

  run<T>(fn: (childLifecycle: Lifecycle) => T | Promise<T>): Promise<T> {
    const childLifecycle = new Lifecycle();
    this.childLifecycles.push(childLifecycle);
    const result = new Promise<T>((resolve) =>
      resolve(Promise.resolve(fn(childLifecycle))),
    );

    return result.finally(() => {
      childLifecycle.cancel();
      this.childLifecycles = this.childLifecycles.filter(
        (child) => child !== childLifecycle,
      );
    });
  }

  addDisposable(disposable: vscode.Disposable): void {
    this.subscriptions.push(disposable);
  }

  cancel(): void {
    if (this.cancelled) {
      return;
    }

    this.cancelled = true;
    this.cancelEmitter.fire();
    this.subscriptions.forEach((sub) => sub.dispose());
    this.childLifecycles.forEach((child) => child.cancel());
    this.subscriptions = [];
    this.childLifecycles = [];
  }
}
