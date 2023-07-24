// Hammer.Manager mock for use in environments without `document` / `window`.
class HammerManagerMock {
    constructor() {
        this.get = () => null;
        this.set = () => this;
        this.on = () => this;
        this.off = () => this;
        this.destroy = () => this;
        this.emit = () => this;
    }
}
export const Manager = HammerManagerMock;
export default null;
//# sourceMappingURL=hammer.js.map