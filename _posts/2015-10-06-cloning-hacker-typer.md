---
layout: post
title: Cloning Hacker Typer
date: 2015-10-06 11:01 -0800
---

I created a clone of the [HackerTyper](http://hackertyper.com/) project in 2015 and wrote a little blog post about it that I have moved here from Medium.

It's a fun little website where you can just type like crazy and it shows a bunch of crazy text like you are hacking into the mainframe. I upgraded the original by generating random code instead of just printing and reprinting the same thing everytime.

I just ported it over to my website so you can [find the app here](/hacker_typer).

## Original Blogpost
If you have never stumbled upon the delightfully hilarious site, [HackerTyper](http://hackertyper.com/), I wonder indeed if you are a user of the internet. It is simple enough. You type anything at all, and a very complicated tangle of C code streams onto the screen at a blistering pace. A very accurate parody of what most of the world seems to think of what [hackers](https://imgur.com/f7rJAZ7) look like.

## HackerTyper Overview
The best research that you can do before heading into battle is to study your opponent. In this case, I decided to examine how HackerTyper does this. After a relatively brief stint codediving, I was able to uncover that contrary to what I previously thought, HackerTyper does not generate the code it presents on the fly. It sends an AJAX call for a [code.txt](http://hackertyper.com/code.txt) file, and then uncovers that file’s contents 3 characters at a time. After it gets to the end of this file, it just stops. Albeit, it does take a good amount of time to finally reach the end of the file, and the general user will never get here. I was disappointed to see how simple it all was.

All of this functionality (and more) is wrapped inside a pretty insane Typer object that I decided to forego for my implementation, as it just seems to add a lot of weird complexity to the code. Who’s to say, though?

## My Implementation 
So I decided pretty early on that I wanted all of displayed code to be procedurally generated. Since this was running in a browser, I obviously need to keep the whole process pretty computationally light. With this restraint in mind, I decided to use a list of preset grammars defined in JSON to create the lines of code. The grammars are saved in the following format:

```json
{code: “ZZZ[ZZZ] = ZZZ.ZZZ();”, vars: “VIVM”}
```

Additionally, I maintain a list of variables and types that can be dropped into the grammars during grammar evaluation. So whenever I need to cerate a line, I randomly select one of the grammars, read what types are necessary from the “vars” string wrapped in the object, and create an array of Strings that are of the proper type, which are spelled out below:

```
V = variable
I = integer
M = method
```

I can then iterate through the grammar and replace every instance of `ZZZ` with the proper item from the array. I decided to decouple the generation of variables from their insertion for simplicity’s sake and personal preference. While I could have used `VVV`, `III`, and `MMM` in the actual code insertion, it would have made the regular expression a little more complicated and then I would have had to include the logic for variable generation in the variable insertion section of the code. It seems much cleaner to me to do these two actions in two distinct steps.

![hacker-typer-ui](/assets/img/ht/ui.png 'This is what it looks like after you start typing. Note that the text will be different each time you load the page')

I maintain a Queue (using Stephen Morley’s [Queue.js](http://code.iamkate.com/javascript/queues/)) of generated lines because this is useful when trying to use control structures or functions. You can pre-generate all the lines, with the various changes in indentation, and then pop them off as needed, and generate new lines whenever the Queue is empty.

I then just maintain a reference to the current line:

```javascript
var curLine = Queue.dequeue();
```

and the current index that marks what portion of this line is being displayed. Which is incremented and compared to the length of curLine to determine whenever a new line is needed from the Queue.

I would also like to think that my implementation of the blinking cursor is cleaner than the original’s. I created an separate `<span>` element that contains the cursor, and toggle it’s visibility on a set interval. The original grab’s the `innerHtml` content, uses `substring()` to remove the last character, and then readds the shortened string to the page. After a few hundred more milliseconds, `|` is readded to the end of the page. I think my method is way easier both to read and to implement.

The original app that I deployed on Heroku was written in Django and the source code is [available here](https://github.com/TimelyToga/hackertyperclone). Since then, I have learned that you don't need a whole Herokuapp to have a static web page, so I've started hosting it [on my own website](/hacker_typer).

