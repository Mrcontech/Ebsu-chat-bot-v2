// The page loads React 18 from cdnjs as a global. The automatic JSX runtime the components
// are compiled for is mapped onto React.createElement here.
const R = window.React;

function withKey(props, key) {
  return key === undefined ? props : Object.assign({}, props, { key });
}

export function jsx(type, props, key) {
  const { children, ...rest } = props || {};
  const p = withKey(rest, key);
  return children === undefined ? R.createElement(type, p) : R.createElement(type, p, children);
}

export function jsxs(type, props, key) {
  const { children, ...rest } = props || {};
  return R.createElement(type, withKey(rest, key), ...(children || []));
}

export const Fragment = R.Fragment;
