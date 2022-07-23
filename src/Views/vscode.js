class VSCodeView extends BaseView {
   Start() {
      return {
         chain: {},
         check: resp=>true
      }
   }
   Render() {
      const frame = document.createElement('iframe')
      frame.className += ' FILL'
      frame.src = "http://localhost:8000/"
      this.$root.append(frame)
   }
}
VSCodeView.template = HTML`
<view-root class='COL resize-box'>
</view-root>
`
View.register('vscode', VSCodeView)