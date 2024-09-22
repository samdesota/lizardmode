import { debug } from "console";
import { jumpCommand } from "./jumpHints";
import { LizardState } from "./stateContexts";
import { moveVertical } from "./commands/navigation";

export const createLizardModeState = (): LizardState => {
  return {
    __name: "lizard mode",
    onEvent: (ctx, event) => {
      debug(__filename, "handling lizard mode event", event);

      if (event.type === "type") {
        // Enter insert mode
        if (event.text === "i") {
          debug(__filename, "exiting lizard mode");
          return {
            preventEditorAction: true,
            done: true,
          };
        }

        if (event.text === "j") {
          return moveVertical(ctx, 1);
        }

        // Jump to node type
        if (event.text === "g") {
          return jumpCommand(ctx);
        }
      }

      return {
        preventEditorAction: true,
        done: false,
      };
    },
  };
};
