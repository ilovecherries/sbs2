'use strict'
// HTML RENDERING
const Draw = NAMESPACE({
	// TODO: rewrite the css/layout for these
	// also, update the icons for the current site's features
	//📥 content‹Content›
	//📤 ‹ParentNode›
	content_label: function(content, link) {
		let e = this()
		// choose icon
		let hidden = !Entity.has_perm(content.permissions, 0, 'R')
		let bg
		if (content.contentType!=CODES.page)
			bg = 'resource/unknownpage.png'
		else if (content.literalType=='category')
			bg = 'resource/category.png'
		else if (hidden)
			bg = 'resource/hiddenpage.png'
		else
			bg = 'resource/page-resource.png'
		let icon = e.firstChild
		icon.style.backgroundImage = `url("${bg}")`
		// label
		e.lastChild.textContent = content.name
		
		return e
	}.bind(𐀶`
<entity-label>
	<span class='item icon iconBg' role=img alt=""></span>
	<span class='textItem entity-title pre'>...</span>
</entity-label>
`),
	
	//📥 text‹String›
	//📤 ‹ParentNode›
	text_item: function(text) {
		let e = this()
		e.textContent = text
		return e
	}.bind(𐀶`<span class='textItem pre'>`),
	
	// user: User / Author
	avatar_url(user, size=100) {
		if (!user || !user.avatar)
			return "resource/avatar.png"
		return Req.file_url(user.avatar, "size="+size+"&crop=true")
	},
	
	//📥 user‹User›
	//📤 ‹ParentNode›
	avatar: function(user) {
		let e = this()
		e.src = Draw.avatar_url(user)
		return e
	}.bind(𐀶`<img class='item avatar' width=100 height=100 alt="">`),
	
	// used by activity
	//📥 user‹User›
	//📤 ‹ParentNode›
	link_avatar: function(user) {
		let a = this()
		a.href = Nav.entity_link(user)
		a.title = user.username
		a.append(Draw.avatar(user))
		return a
	}.bind(𐀶`<a tabindex=-1 role=gridcell>`),
	
	//📥 user‹User›
	//📤 ‹ParentNode›
	userlist_avatar: function(user, status) {
		let e = this()
		e.href = Nav.entity_link(user)
		e.firstChild.src = Draw.avatar_url(user)
		e.firstChild.title = user.username
		e.dataset.uid = user.id
		if (status == "idle")
			e.classList.add('status-idle')
		return e
	}.bind(𐀶`<a tabindex=-1><img class='avatar' width=100 height=100 alt="">`),
	
	//📥 comment‹Message›
	//📤 ‹ParentNode›
	message_block: function(comment) {
		let e = this.block()
		
		let author = comment.Author
		
		e.dataset.uid = comment.createUserId
		e.nonce = comment.Author.merge_hash
		
		let avatar
		if (author.bigAvatar) {
			avatar = this.big_avatar()
			let url = Req.file_url(author.bigAvatar, "size=500")
			avatar.style.backgroundImage = `url("${url}")`
		} else {
			avatar = this.avatar()
			avatar.src = Draw.avatar_url(author)
		}
		e.prepend(avatar)
		
		let name = e.querySelector('message-username') // todo: is queryselector ok?
		let username
		if (author.nickname == null) {
			username = author.username
		} else {
			username = author.nickname
			if (author.bridge)
				name.append(this.bridge())
			else {
				let nickname = this.nickname()
				nickname.querySelector('span.pre').textContent = author.username
				name.append(nickname)
			}
		}
		name.firstChild.textContent = username
		
		let time = e.querySelector('time')
		time.dateTime = comment.createDate
		time.textContent = Draw.time_string(comment.createDate2)
		
		return [e, e.lastChild]
	}.bind({
		block: 𐀶`
<message-block>
	<message-header>
		<message-username><span class='username pre'></span>:</message-username>
		<time></time>
	</message-header>
	<message-contents></message-contents>
</message-block>`,
		nickname: 𐀶` <span class='real-name-label'>(<span class='pre'></span>)</span>`,
		bridge: 𐀶` <span class='real-name-label'>[discord bridge]</span>`,
		avatar: 𐀶`<img class='avatar' width=100 height=100 alt="">`,
		big_avatar: 𐀶`<div class='bigAvatar'></div>`,
	}),
	
	//📥 comment‹Message›
	//📤 ‹ParentNode›
	message_part: function(comment) {
		let e = this()
		
		if (comment.edited)
			e.className += " edited"
		
		e.dataset.id = comment.id
		e.nonce = comment.createDate2.getTime()
		Markup.convert_lang(comment.text, comment.values.m, e, {intersection_observer: View.observer})
		return e
	}.bind(𐀶`<message-part role=listitem tabindex=-1>`),
	
	//📥 date‹Date›
	//📤 ‹String›
	time_string(date) {
		// time string as something like: (depends on locale)
		// today: "10:37 AM"
		// older: "December 25, 2021, 4:09 PM"
		let options
		if (Date.now()-date.getTime() > 1000*60*60*12)
			options = {year:'numeric', month:'long', day:'numeric', hour:'numeric', minute:'2-digit'}
		else
			options = {hour:'numeric', minute:'2-digit'}
		return date.toLocaleString([], options)
	},
	
	button: function(label, onclick) {
		let e = this()
		e.append(label)
		e.onclick = onclick
		return e
	}.bind(𐀶`<button>`),
	
	time_ago: function(time) {
		let e = this()
		e.setAttribute('datetime', time.toISOString())
		e.textContent = Draw.time_ago_string(time)
		e.title = time.toString()
		return e
	}.bind(𐀶`<time class='time-ago'>`),
	
	time_ago_string(date) {
		let seconds = (Date.now() - date.getTime()) / 1000
		let desc = [
			[31536000, 1, "year", "years"],
			[2592000, 1, "month", "months"],
			[86400, 1, "day", "days"],
			[3600, 0, "hour", "hours"],
			[60, 0, "min", "min"],
		].find(desc => seconds > desc[0]*0.96)
		if (!desc)
			return "Just now"
		let round = (seconds/desc[0]).toFixed(desc[1]).replace(/[.]0/, "")
		let units = +round==1 ? desc[2] : desc[3]
		return `${round} ${units} ago`
		/*if (seconds <= -0.5)
		  return " IN THE FUTURE?"
		  return Math.round(seconds) + " seconds ago"*/
	},
	
	sidebar_comment: function(comment) {
		let d = this()
		d.dataset.id = comment.id
		
		// for bridge messages, display nicknames instead of username
		let author = comment.Author
		let name = author.bridge ? author.nickname+"*" : author.username
		
		d.title = `${name} in ${comment.contentId}:\n${comment.text}`
		// todo: page name 🥺  oh︕ emojis render in italic? don't remember adding that...   we should store refs to pages but like intern them so its not a memory leak...
		
/*todo: fix,		if (comment.editDate && comment.editUserId!=comment.createUserId) {
			d.append(
				entity_title_link(comment.editUser),
				" edited ",
			)
			}*/
		let link = d.firstChild
		link.href = "#user/"+comment.createUserId
		link.firstChild.src = Draw.avatar_url(author)
		link.lastChild.textContent = name
		
		d.append(comment.text.replace(/\n/g, "  "))
		
		return d
	}.bind(𐀶`
<div class='bar rem1-5 sidebarComment ellipsis'>
	<a tabindex=-1 class='user-label'>
		<img class='item icon avatar' width=100 height=100>
		<span class='textItem entity-title pre'></span>
	</a>:&#32;
</div>
`),
	
	user_label: function(user) {
		let e = this()
		e.href = "#user/"+user.id
		e.firstChild.src = Draw.avatar_url(user)
		e.lastChild.textContent = user.username
		return e
	}.bind(𐀶`
<a tabindex=-1 class='bar rem1-5 user-label'>
	<img class='item icon avatar' width=100 height=100>
	<span class='textItem entity-title pre'></span>
</a>
`),
	
	// opt: todo: what if instead of passing the func to the callback
	// we just pass elem and let the user run elem.disabled=false?
	event_lock(callback) {
		return ev=>{
			let elem = ev.currentTarget
			if (elem.disabled) return
			elem.disabled = true
			callback(()=>{elem.disabled = false}, elem)
		}
	}
})
