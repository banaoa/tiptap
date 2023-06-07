import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface DiffOptions {
  className: string
  // 全部 | 最深 | 最浅
  mode: 'all' | 'deepest' | 'shallowest'
}

export const DiffClasses = Extension.create<DiffOptions>({
  name: 'diff',

  addOptions() {
    return {
      className: 'has-focus',
      mode: 'all',
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('diff'),
        props: {
          decorations: ({ doc, selection }) => {
            // return DecorationSet.create(doc, [])
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
                // https://www.xheldon.com/tech/prosemirror-guide-chinese.html#indexing
                // nodeSize: 表示该节点的大小，由基于整数的 indexing scheme 决定。 对于文本节点，它是字符数，对于其他叶子节点，是 1。对于非叶子节点，它是其内容的大小加上 2（开始和结束标签）。
                // isCurrent: 当前选区是否在该节点内
                const isCurrent = anchor >= pos && anchor <= pos + node.nodeSize - 1

                // anchor: 当前选区的锚点
                // pos: 当前节点的起始位置
                // node.nodeSize: 当前节点的大小
                console.log('node', anchor, pos, node.nodeSize - 1, node.toString())
                if (!isCurrent) {
                  // 当回调处理一个节点的时候返回 false ，则后续不会继续对该节点的子节点再调用该回调了。
                  return false
                }
                // 当前节点的层级
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
                  id: '123',
                  type: 'fff',
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
