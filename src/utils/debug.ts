export const debug = (fileName: string, message: string, ...info: any[]) => {
  console.log(
    `[${fileName}] ${message}:`,
    ...info.map((i) => JSON.stringify(i)),
  );
};
