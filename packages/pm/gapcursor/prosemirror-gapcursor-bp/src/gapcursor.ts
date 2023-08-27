import { Node, ResolvedPos, Slice } from 'prosemirror-model'
import { NodeSelection, Selection } from 'prosemirror-state'
import { Mappable } from 'prosemirror-transform'

/// Gap cursor selections are represented using this class. Its
/// `$anchor` and `$head` properties both point at the cursor position.
export class GapCursor extends Selection {
  /// Create a gap cursor.
  constructor($pos: ResolvedPos) {
    super($pos, $pos)
  }

  map(doc: Node, mapping: Mappable): Selection {
    const $pos = doc.resolve(mapping.map(this.head))

    return GapCursor.valid($pos) ? new GapCursor($pos) : Selection.near($pos)
  }

  content() { return Slice.empty }

  eq(other: Selection): boolean {
    return other instanceof GapCursor && other.head == this.head
  }

  toJSON(): any {
    return { type: 'gapcursor', pos: this.head }
  }

  /// @internal
  static fromJSON(doc: Node, json: any): GapCursor {
    if (typeof json.pos !== 'number') { throw new RangeError('Invalid input for GapCursor.fromJSON') }
    return new GapCursor(doc.resolve(json.pos))
  }

  /// @internal
  getBookmark() { return new GapBookmark(this.anchor) }

  /// @internal
  static valid($pos: ResolvedPos) {
    const parent = $pos.parent

    if (parent.isTextblock || !closedBefore($pos) || !closedAfter($pos)) { return false }
    const override = parent.type.spec.allowGapCursor

    if (override != null) { return override }
    const deflt = parent.contentMatchAt($pos.index()).defaultType

    return deflt && deflt.isTextblock
  }

  /// @internal
  static findGapCursorFrom($pos: ResolvedPos, dir: number, mustMove = false) {
    search: for (;;) {
      if (!mustMove && GapCursor.valid($pos)) { return $pos }
      let pos = $pos.pos; let
        next = null
      // Scan up from this position

      for (let d = $pos.depth; ; d--) {
        const parent = $pos.node(d)

        if (dir > 0 ? $pos.indexAfter(d) < parent.childCount : $pos.index(d) > 0) {
          next = parent.child(dir > 0 ? $pos.indexAfter(d) : $pos.index(d) - 1)
          break
        } else if (d == 0) {
          return null
        }
        pos += dir
        const $cur = $pos.doc.resolve(pos)

        if (GapCursor.valid($cur)) { return $cur }
      }

      // And then down into the next node
      for (;;) {
        const inside: Node | null = dir > 0 ? next.firstChild : next.lastChild

        if (!inside) {
          if (next.isAtom && !next.isText && !NodeSelection.isSelectable(next)) {
            $pos = $pos.doc.resolve(pos + next.nodeSize * dir)
            mustMove = false
            continue search
          }
          break
        }
        next = inside
        pos += dir
        const $cur = $pos.doc.resolve(pos)

        if (GapCursor.valid($cur)) { return $cur }
      }

      return null
    }
  }
}

GapCursor.prototype.visible = false;
(GapCursor as any).findFrom = GapCursor.findGapCursorFrom

Selection.jsonID('gapcursor', GapCursor)

class GapBookmark {
  constructor(readonly pos: number) {}

  map(mapping: Mappable) {
    return new GapBookmark(mapping.map(this.pos))
  }

  resolve(doc: Node) {
    const $pos = doc.resolve(this.pos)

    return GapCursor.valid($pos) ? new GapCursor($pos) : Selection.near($pos)
  }
}

function closedBefore($pos: ResolvedPos) {
  for (let d = $pos.depth; d >= 0; d--) {
    const index = $pos.index(d); const
      parent = $pos.node(d)
    // At the start of this parent, look at next one

    if (index == 0) {
      if (parent.type.spec.isolating) { return true }
      continue
    }
    // See if the node before (or its first ancestor) is closed
    for (let before = parent.child(index - 1); ; before = before.lastChild!) {
      if ((before.childCount == 0 && !before.inlineContent) || before.isAtom || before.type.spec.isolating) { return true }
      if (before.inlineContent) { return false }
    }
  }
  // Hit start of document
  return true
}

function closedAfter($pos: ResolvedPos) {
  for (let d = $pos.depth; d >= 0; d--) {
    const index = $pos.indexAfter(d); const
      parent = $pos.node(d)

    if (index == parent.childCount) {
      if (parent.type.spec.isolating) { return true }
      continue
    }
    for (let after = parent.child(index); ; after = after.firstChild!) {
      if ((after.childCount == 0 && !after.inlineContent) || after.isAtom || after.type.spec.isolating) { return true }
      if (after.type.name === 'blockquote') { return true }
      if (after.inlineContent) { return false }
    }
  }
  return true
}
