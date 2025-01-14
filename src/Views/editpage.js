'use strict'

class EditView extends BaseView {
	Init() {
		this.page = null
		this.show_preview = false
		this.live_preview = false
		this.sections = null
		this.current_section = null
		this.sections_invalid = true
		this.text = null
		this.modified = false
		
		this.resize = new ResizeBar(this.$top, this.$resize, 'top', null, '400') // todo pick a better size here
		
		this.$save = Draw.button("Save", Draw.event_lock(done=>{
			if (!this.page)
				return
			let data
			try {
				data = JSON.parse(this.$data.value)
			} catch (e) {
				done()
				print(e)
				return
			}
			data.text = this.page.text
			data.keywords = this.$edit_keywords.value.match(/[^,\s]+/g) || []
			data.name = this.$edit_name.value
			data.literalType = this.$edit_type.value
			
			let text
			if (this.current_section == null) {
				text = this.$textarea.value
			} else {
				this.sections[this.current_section].text = this.$textarea.value
				text = this.text = this.sections.map(x=>x.lnl+x.text).join("")
			}
			let change = text.length - data.text.length
			let percent = change/data.text.length*100
			if (percent < -25)
				if (!confirm("are you sure you want to save?\ntext length changed by "+percent.toFixed(1)+"% ("+change+" chars)"))
					return void done()
			data.text = text
			
			Object.assign(this.page, data)
			this.save(done)
		}))
		this.$save.className = 'item save-button'
		this.Slot.$header_extra.append(this.$save)
		
		let batch = (cb,w=0)=>e=>w++||requestAnimationFrame(_=>cb(e,w=0))
		this.$preview_button.onchange = e=>{
			this.toggle_preview(e.target.checked)
		}
		this.$live_button.onchange = e=>{
			this.live_preview = e.target.checked
			if (this.live_preview)
				this.update_preview()
		}
		this.$textarea.addEventListener('input', batch(e=>{
			if (this.show_preview && this.live_preview)
				this.update_preview()
		}), {passive: true})
		this.$data.onchange = ev=>{
			this.set_modified(true)
		}
		this.$textarea.onchange = ev=>{
			this.set_modified(true)
			if (this.current_section==null)
				this.sections_invalid = true
		}
		this.$render_button.onclick = e=>{
			this.update_preview(true)
		}
		
		this.$section.onfocus = ev=>{
			if (this.sections_invalid) {
				if (this.current_section==null) {
					this.text = this.$textarea.value
					this.find_sections()
				}
			}
		}
		this.$section.onchange = ev=>{
			this.choose_section(ev.target.value)
		}
		this.$horizontal.onchange = ev=>{
			let c = this.$horizontal.checked
			this.$root.classList.toggle('ROW', c)
			this.$root.classList.toggle('COL', !c)
			this.resize.switch(c ? 'right' : 'top')
			this.$resize.style.setProperty('--bar-height', c ? "5em" : "2em")
			if (!c)
				this.$root.prepend(this.$top, this.$resize)
			else
				this.$root.append(this.$resize, this.$top)
		}
		this.$wrap.onchange = ev=>{
			let w = this.$wrap.checked
			this.$textarea.style.whiteSpace = w ? 'pre-wrap' : 'pre'
		}
	}
	set_modified(state) {
		View.protect(this, state)
		this.modified = state
		this.$save.classList.toggle('modified', state)
		//print('modified')
	}
	choose_section(id) {
		if (this.sections_invalid)
			return
		if (this.current_section != null)
			this.sections[this.current_section].text = this.$textarea.value
		
		let text
		if (id=='all') {
			this.current_section = null
			text = this.text = this.sections.map(x=>x.lnl+x.text).join("")
		} else {
			this.current_section = id
			text = this.sections[this.current_section].text
		}
		this.$textarea.value = text
		
		if (this.show_preview && this.live_preview)
			this.update_preview()
		else
			this.$preview.fill()
	}
	Start({id, query: {parent}}) {
		this.parent_id = null
		if (id==null) {
			this.parent_id = +parent || 0
			return {quick: true}
		}
		return {
			chain: {
				values: {
					pid: id,
				},
				requests: [
					{type: 'content', fields: "*", query: "id = @pid"},
					{type: 'user', fields: "*", query: "id IN @content.createUserId"},
				],
			},
			check(resp) {
				return resp.content[0]
			},
		}
	}
	Quick() {
		// hack to create new page object
		// todo: clean up TYPES
		let page = TYPES.content(Object.assign({}, TYPES.content.prototype))
		page.contentType = ABOUT.details.codes.InternalContentType.page
		page.values = {
			markupLang: Settings.values.chat_markup,
		}
		page.name = "New Page"
		page.parentId = this.parent_id
		page.permissions = {"0":"CR"}
		this.creating = true
		this.got_page(page, true)
	}
	Render({content:[page], user}) {
		this.creating = false
		this.got_page(page)
	}
	Insert_Text(text) {
		Edit.insert(this.$textarea, text)
	}
	got_page(page, creating=false) {
		this.Slot.set_entity_title(page)
		this.page = page
		this.text = this.page.text
		//$editorSave.textContent = creating ? "Create" : "Save"
		if (!creating)
			this.Slot.add_header_links([
				{label:"back", href:"#page/"+page.id},
			])
		this.$textarea.value = page.text //todo: preserve undo?
		// only show writable fields
		let writable = {}
		for (let [k,v] of Object.entries(page)) {
			let info = ABOUT.details.types.content[k]
			if (!info || info[creating?'writableOnInsert':'writableOnUpdate']) {
				if (k!='text' && k!='keywords' && k!='name' && k!='literalType')
					writable[k] = v
			}
		}
		this.$data.value = JSON.stringify(writable, null, 1)
		this.$edit_keywords.value = page.keywords.join(" ")
		this.$edit_name.value = page.name
		this.$edit_type.value = page.literalType
		
		this.$preview_button.checked = false
		this.toggle_preview(false)
		this.$live_button.checked = true
		this.live_preview = true
		//this.update_preview()
	}
	toggle_preview(state) {
		this.show_preview = state
		this.$preview_outer.classList.toggle('shown', state)
		this.$fields.classList.toggle('shown', !state)
		this.$preview_controls.hidden = !state
		if (state) {
			this.update_preview()
		} else {
			this.$preview.fill()
		}
	}
	find_sections() {
		let spl = this.text.split(/(\n*^#+ .*)/mg)
		let sections = [{name:"<top>", text:spl[0], lnl:""}]
		sections.all = {name:"<all>"}
		for (let i=1; i<spl.length; i+=2) {
			let hd = spl[i]
			let lnl = hd[0]=="\n"
			if (lnl)
				hd = hd.substring(1)
			sections.push({name:hd.trim(), text:hd+spl[i+1], lnl:lnl?"\n":""})
		}
		
		let o = document.createElement('option')
		o.value = "all"
		o.text = "<all>"
		this.$section.fill(o)
		
		sections.forEach((x,i)=>{
			let o = document.createElement('option')
			o.value = i
			o.text = x.name
			this.$section.add(o)
		})
		
		this.sections = sections
		this.sections_invalid = false
		//return sections
	}
	update_preview(full) {
		let shouldScroll = this.$preview_outer.scrollHeight-this.$preview_outer.clientHeight-this.$preview_outer.scrollTop
		Markup.convert_lang(this.$textarea.value, this.page.values.markupLang, this.$preview, {preview: !full})
		//console.log(shouldScroll, 'scr?')
		if (shouldScroll < 20)
			this.$preview_outer.scrollTop = 9e9
	}
	save(callback) {
		Req.write(this.page).do = (resp, err)=>{
			if (err) {
				alert('❌ page edit failed')
				print('❌ page edit failed!')
			} else {
				
				//alert('✅ saved page')
				this.set_modified(false)
				print('✅ saved page')
				if (this.creating) {
					this.creating = false
					this.got_page(resp)
				}
				//this.got_page(resp, false)
			}
			callback && callback(!err)
		}
		print('💾 saving page')
	}
}

EditView.template = HTML`
<view-root class='resize-box COL'>
	<div $=top class='sized page-container SLIDES'>
		<scroll-outer data-slide=preview $=preview_outer><scroll-inner $=preview class='pageContents editPageContents'></scroll-inner></scroll-outer>
		<div data-slide=fields $=fields class='COL' style=padding:0.5rem>
<!--			<label>Name:<input $=name></label>
			<label>Type:<input $=type></label>
			<label>Description:<input $=description></label>
			<label>Parent ID:<input $=description type=number></label>-->
			<label class='edit-field'>Title:<input $=edit_name></label>
			<label class='edit-field'>Kind:<input $=edit_type placeholder=literalType></label>
			<label class='edit-field'>Keywords:<input $=edit_keywords style=word-spacing:0.5em></label>
			<textarea $=data style="resize:none;" class='FILL code-textarea'></textarea>
		</div>
	</div>
	<resize-handle $=resize style='--bar-height:2em;gap:0.25rem;' class='nav'>
		<label>preview:<input type=checkbox $=preview_button></label>
		<span $=preview_controls style=display:contents>
			| <label>live:<input type=checkbox $=live_button></label>
			<button $=render_button>render full</button>
		</span>
		<label>| Section: <select style='width:5rem;' $=section></select></label>
		<label>horizontal:<input $=horizontal type=checkbox></label>
		<label>wrap:<input $=wrap type=checkbox checked></label>
	</resize-handle>
	<textarea $=textarea class='FILL editor-textarea' style='margin:3px;'></textarea>
</view-root>
`

View.register('editpage', EditView)
