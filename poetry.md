--- 
title: Poetry
permalink: /poetry
--- 

I am fascinated with the written word for communicating a precise emotion. From time to time, 
I like to try and capture a snapshot of a powerful emotion that I have felt. I think frequently 
poems are written that intensionally arcane and confusing but nonetheless the author spirits you 
to a particular state of mind.

My favorite poets are: 

* [Pablo Neruda](https://www.poetryfoundation.org/poets/pablo-neruda)
    * My favorite: [Tonight I Can Write (The saddest lines)](https://allpoetry.com/Tonight-I-Can-Write-(The-Saddest-Lines))
* [Billy Collins](https://www.youtube.com/watch?v=ddw1_3ZVjTE)
* [William Earnest Henley](https://www.poetryfoundation.org/poets/william-ernest-henley)
    * My favorite: [Invictus](https://www.poetryfoundation.org/poems/51642/invictus)
* Carl Sagan
    * My favorite: [A Pale Blue Dot](https://www.planetary.org/explore/space-topics/earth/pale-blue-dot.html)
* William Wordsworth
    * My favorite: [I Wandered Lonely as a Cloud](https://www.poetryfoundation.org/poems/45521/i-wandered-lonely-as-a-cloud)

## Poetry wallpapers 
In college, I got the idea that it would be fun to learn how to use Adobe Illustrator, so I made [a desktop wallpaper every week](https://www.behance.net/gallery/19454861/Wallpapers) 
that featured poetry quotes.

## My Poems
{% for poem in site.poetry %}
<h3>
    <a href="{{ poem.url}}">
    {{poem.title}}
    - {{poem.date | date: "%Y.%m.%d"}}
    </a>
</h3>
<p>{{ poem.description }}</p>
{% endfor %}