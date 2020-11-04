---
layout: page
title: Writings
permalink: /writings
---

I've been keeping a digital journal for quite a few years now. I think one of the most interesting things about reading it back is the sharpness of your own memories as you browse through your personal history.

Your words remind you of a moment in your life to inspire embarrassment and pride in equal parts. First at your unbelievable inability to act reasonably and the second for acting in a way that you find compatible with who you think you are. This is worded carefully, because I have found that the stories I tell about myself and myself in actuality have a tendency to drift if I'm not careful.

## Science Fiction

I read more science fiction than anything else. I encourage you to check out my read list on [Goodreads](https://www.goodreads.com/user/show/7414236-tim-blumberg) and occasionally I will attempt to have my hand at writing my own short stories.

{% for story in site.scifi %}

<h3>
    <a href="{{ story.url}}">
    {{story.title}} - {{story.date | date: "%Y.%m.%d"}}
    </a>
</h3>
<p>{{ story.description }}</p>
{% endfor %}
