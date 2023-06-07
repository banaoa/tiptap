import { Editor, Extension } from '@tiptap/core'
import { Node as ProsemirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface PlaceholderOptions {
  emptyEditorClass: string
  emptyNodeClass: string
  placeholder:
    | ((PlaceholderProps: {
        editor: Editor
        node: ProsemirrorNode
        pos: number
        hasAnchor: boolean
      }) => string)
    | string
  showOnlyWhenEditable: boolean
  showOnlyCurrent: boolean
  includeChildren: boolean
}

export const Placeholder = Extension.create<PlaceholderOptions>({
  name: 'placeholder',

  addOptions() {
    return {
      emptyEditorClass: 'is-editor-empty',
      emptyNodeClass: 'is-empty',
      placeholder: 'Write something …',
      showOnlyWhenEditable: true,
      showOnlyCurrent: true,
      includeChildren: false,
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('placeholder'),
        props: {
          decorations: ({ doc, selection }) => {
            const active = this.editor.isEditable || !this.options.showOnlyWhenEditable
            const { anchor } = selection
            const decorations: Decoration[] = []

            if (!active) {
              return null
            }
            // createAndFill: 和 create 类似，不过该方法会查看是否有必要在给定的 fragment 开始和结尾的地方 添加一些节点，以让该 fragment 适应当前 node。如果没有找到合适的包裹节点，则返回 null。 记住，如果你传递 null 或者 Fragment.empty 作为内容会导致其一定会适合当前 node，因此该方法一定会成
            // only calculate isEmpty once due to its performance impacts (see issue #3360)
            const emptyDocInstance = doc.type.createAndFill()

            // sameMarkup: 比较当前与给定节点的 markup（包含类型、attributes 和 marks）是否相等。如果相同返回 true。
            // findDiffStart: 寻找当前 fragment 和给定 fragment 的第一个不同的位置，如果它们相同的话返回 null。
            const isEditorEmpty = emptyDocInstance?.sameMarkup(doc)
              && emptyDocInstance.content.findDiffStart(doc.content) === null

            doc.descendants((node, pos) => {
              const hasAnchor = anchor >= pos && anchor <= pos + node.nodeSize
              const isEmpty = !node.isLeaf && !node.childCount

              if ((hasAnchor || !this.options.showOnlyCurrent) && isEmpty) {
                const classes = [this.options.emptyNodeClass]

                if (isEditorEmpty) {
                  classes.push(this.options.emptyEditorClass)
                }

                const decoration = Decoration.node(pos, pos + node.nodeSize, {
                  class: classes.join(' '),
                  'data-placeholder':
                    typeof this.options.placeholder === 'function'
                      ? this.options.placeholder({
                        editor: this.editor,
                        node,
                        pos,
                        hasAnchor,
                      })
                      : this.options.placeholder,
                })

                decorations.push(decoration)
              }

              return this.options.includeChildren
            })

            return DecorationSet.create(doc, decorations)
          },
        },
      }),
    ]
  },
})
