// prettier-ignore
export const lowerCaseKeys = [
  "`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=",
  "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\",
  "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'",
  "z", "x", "c", "v", "b", "n", "m", ",", ".", "/",
]

// prettier-ignore
export const upperCaseKeys = [
  "~", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_", "+",
  "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "{", "}", "|",
  "A", "S", "D", "F", "G", "H", "J", "K", "L", ":", "\"",
  "Z", "X", "C", "V", "B", "N", "M", "<", ">", "?",
]

export const nonCharacterKeys = [
  "Enter",
  "Tab",
  "Backspace",
  "Escape",
  "Space",
];

export const bindings = [
  ...lowerCaseKeys.map((key) => ({
    key,
    typedKey: key,
    command: `lizard.type.code_${key.charCodeAt(0)}`,
  })),

  ...lowerCaseKeys.map((key) => ({
    key: "shift+" + key,
    typedKey: upperCaseKeys[lowerCaseKeys.indexOf(key)],
    command: `lizard.type.code_shift_${key.charCodeAt(0)}`,
  })),
];
