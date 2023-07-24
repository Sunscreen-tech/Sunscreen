import {IViewerObject} from './iViewerObject'
export class EventArgs {}

export class ObjectUnderMouseCursorChangedEventArgs extends EventArgs {
  oldObject: IViewerObject

  //  The old object under the mouse

  public get OldObject(): IViewerObject {
    return this.oldObject
  }
  public set OldObject(value: IViewerObject) {
    this.oldObject = value
  }

  newObject: IViewerObject

  //  the new object under the mouse

  public get NewObject(): IViewerObject {
    return this.newObject
  }
  public set NewObject(value: IViewerObject) {
    this.newObject = value
  }

  //  constructor

  public constructor(oldObject: IViewerObject, newObject: IViewerObject) {
    super()
    this.OldObject = oldObject
    this.NewObject = newObject
  }
}
