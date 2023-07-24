// Hammer.Manager mock for use in environments without `document` / `window`.
class HammerManagerMock {
  get = () => null;
  set = () => this;
  on = () => this;
  off = () => this;
  destroy = () => this;
  emit = () => this;
}

export const Manager = HammerManagerMock;

export default null;
