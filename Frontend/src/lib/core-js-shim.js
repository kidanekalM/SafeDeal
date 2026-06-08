import globalThisShim from './global-this';

// eslint-disable-next-line es/no-object-defineproperty -- safe
var defineProperty = Object.defineProperty;

export default function (key, value) {
  try {
    defineProperty(globalThisShim, key, { value: value, configurable: true, writable: true });
  } catch (error) {
    globalThisShim[key] = value;
  } return value;
};
