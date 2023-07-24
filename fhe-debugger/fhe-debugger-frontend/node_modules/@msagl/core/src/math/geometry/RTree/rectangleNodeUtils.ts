import {RectangleNode} from './rectangleNode'

export function CrossRectangleNodes<TA, TB, P>(a: RectangleNode<TA, P>, b: RectangleNode<TB, P>, action: (u: TA, v: TB) => void) {
  if (!a.irect.intersects_rect(b.irect)) return
  if (a.Left == null) {
    //a is a leat
    if (b.Left == null)
      //b is a leaf
      action(a.UserData, b.UserData)
    else {
      CrossRectangleNodes(a, b.Left, action)
      CrossRectangleNodes(a, b.Right, action)
    }
  } else {
    //a is not a leaf
    if (b.Left != null) {
      CrossRectangleNodes(a.Left, b.Left, action)
      CrossRectangleNodes(a.Left, b.Right, action)
      CrossRectangleNodes(a.Right, b.Left, action)
      CrossRectangleNodes(a.Right, b.Right, action)
    } else {
      // b is a leaf
      CrossRectangleNodes(a.Left, b, action)
      CrossRectangleNodes(a.Right, b, action)
    }
  }
}

export function CrossRectangleNodesSameType<T, P>(a: RectangleNode<T, P>, b: RectangleNode<T, P>, action: (u: T, v: T) => void) {
  if (!a.irect.intersects_rect(b.irect)) return
  if (a === b) HandleEquality(a, action)
  else if (a.Left == null) {
    if (b.Left == null) {
      action(a.UserData, b.UserData)
    } else {
      CrossRectangleNodesSameType(a, b.Left, action)
      CrossRectangleNodesSameType(a, b.Right, action)
    }
  } else {
    if (b.Left != null) {
      CrossRectangleNodesSameType(a.Left, b.Left, action)
      CrossRectangleNodesSameType(a.Left, b.Right, action)
      CrossRectangleNodesSameType(a.Right, b.Left, action)
      CrossRectangleNodesSameType(a.Right, b.Right, action)
    } else {
      CrossRectangleNodesSameType(a.Left, b, action)
      CrossRectangleNodesSameType(a.Right, b, action)
    }
  }
}

// returns true if "property" holds for some pair
export function FindIntersectionWithProperty<T, P>(
  a: RectangleNode<T, P>,
  b: RectangleNode<T, P>,
  property: (u: T, v: T) => boolean,
): boolean {
  if (!a.irect.intersects_rect(b.irect)) return false
  if (a === b) return HandleEqualityCheck(a, property)

  if (a.Left == null) {
    if (b.Left == null) return property(a.UserData, b.UserData)

    if (FindIntersectionWithProperty(a, b.Left, property)) return true
    if (FindIntersectionWithProperty(a, b.Right, property)) return true
  } else {
    if (b.Left != null) {
      if (FindIntersectionWithProperty(a.Left, b.Left, property)) return true
      if (FindIntersectionWithProperty(a.Left, b.Right, property)) return true
      if (FindIntersectionWithProperty(a.Right, b.Left, property)) return true
      if (FindIntersectionWithProperty(a.Right, b.Right, property)) return true
    } else {
      if (FindIntersectionWithProperty(a.Left, b, property)) return true
      if (FindIntersectionWithProperty(a.Right, b, property)) return true
    }
  }
  return false
}

function HandleEqualityCheck<T, P>(a: RectangleNode<T, P>, func: (u: T, v: T) => boolean): boolean {
  if (a.Left == null) return false //we don't do anything for two equal leafs
  return (
    FindIntersectionWithProperty(a.Left, a.Left, func) ||
    FindIntersectionWithProperty(a.Left, a.Right, func) ||
    FindIntersectionWithProperty(a.Right, a.Right, func)
  )
}

// we need to avoid calling action twice for the same pair
function HandleEquality<T, P>(a: RectangleNode<T, P>, action: (u: T, v: T) => void) {
  if (a.Left == null) return //we don't do anything for two equal leafs
  CrossRectangleNodesSameType(a.Left, a.Left, action)
  CrossRectangleNodesSameType(a.Left, a.Right, action)
  CrossRectangleNodesSameType(a.Right, a.Right, action)
}
