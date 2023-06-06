import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface FocusOptions {
  className: string
  // 全部 | 最深 | 最浅
  mode: 'all' | 'deepest' | 'shallowest'
}

export const FocusClasses = Extension.create<FocusOptions>({
  name: 'focus',

  addOptions() {
    return {
      className: 'has-focus',
      mode: 'all',
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('focus'),
        props: {
          decorations: ({ doc, selection }) => {
            // isEditable:是否可编辑/只读, isFocused:文档没有?
            const { isEditable, isFocused } = this.editor
            // anchor: 当选区变化的时候，其不动的一侧
            const { anchor } = selection
            // decorations: 装饰器是用来影响文档的展现但是又不实际改变文档内容的一种方式。
            const decorations: Decoration[] = []

            if (!isEditable || !isFocused) {
              // DecorationSet: 一个 decorations 集合，用这种数据结构组织它们可以让绘制算法高效的对比和渲染它们。 它是一个不可突变的数据结构，它不改变，更新会产生新的值。
              // create: 用给定文档的结构，创建一个 decorations 集合。
              return DecorationSet.create(doc, [])
            }

            // Maximum Levels
            let maxLevels = 0

            // 最深模式
            if (this.options.mode === 'deepest') {
              // https://www.xheldon.com/tech/prosemirror-guide-chinese.html#indexing
              // 对每一个后代节点调用给定的回调函数 f。当回调处理一个节点的时候返回 false ，则后续不会继续对该节点的子节点再调用该回调了。
              // 注: 上述递归都是深度优先。
              doc.descendants((node, pos) => {
                if (node.isText) {
                  return
                }

                const isCurrent = anchor >= pos && anchor <= pos + node.nodeSize - 1

                if (!isCurrent) {
                  return false
                }

                maxLevels += 1
              })
            }

            // Loop through current
            let currentLevel = 0

            doc.descendants((node, pos) => {
              if (node.isText) {
                return false
              }

              const isCurrent = anchor >= pos && anchor <= pos + node.nodeSize - 1

              if (!isCurrent) {
                return false
              }

              currentLevel += 1

              const outOfScope = (this.options.mode === 'deepest' && maxLevels - currentLevel > 0)
                || (this.options.mode === 'shallowest' && currentLevel > 1)

              if (outOfScope) {
                return this.options.mode === 'deepest'
              }

              decorations.push(
                Decoration.node(pos, pos + node.nodeSize, {
                  class: this.options.className,
                }),
              )
            })

            return DecorationSet.create(doc, decorations)
          },
        },
      }),
    ]
  },
})
