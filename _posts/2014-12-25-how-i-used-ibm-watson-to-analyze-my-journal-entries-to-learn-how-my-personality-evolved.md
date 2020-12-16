---
layout: post
title: How I Used IBM Watson to Analyze My Journal Entries to Learn How my Personality
  Evolved
date: 2014-12-25 18:57 -0800
---

*I am in the process of moving all my blog posts from Medium to my personal site because Medium is turning into a very different platform than the one that I originally started blogging on back in 2014. Medium is now trying to empower creators to get paid for the content they create, which I endorse, but makes it annoying when you are just browsing content not made with this in mind. I blog because I like the process, so I’m moving it all here.*

<br/>

If you haven’t played around with IBM Watson’s [newest tech demo](http://watson-um-demo.mybluemix.net/), then you absolutely need to. It attempts to create a personality profile of someone through their writing or speech. It has been used to great effect to [analyze the cast of LoTR](http://vinmisra.github.io/2014/12/19/gollum-is-a-pretty-vulnerable-guy/) and point out the differences between the original characters in the books and Peter Jackson’s versions in his six films.

So after seeing the tech demo, I immediately wondered how accurate the profiles that Watson was churning out actually were. Since I know myself the best and I have kept a longstanding digital journal, I decided it would be an excellent way to put Watson to the test.

## Journal Entries to Plain Text
I have kept a digital journal since September of 2011 using [Evernote](https://evernote.com/). Evernote is an exceptionally useful choice for a journal because I always had a local copy and more importantly, I didn’t have to be online to write a journal entry.

<img src="/assets/img/ibm/export-entries.png" style="max-height: 300px; display: block; margin: 0 auto;" alt="exporting-from-evernote" title="Exporting Notes from Evernote is super complicated, so I am glad to show you how to do it"/>

My first task was to get my journal entries into a single, plain text file so that I could submit to IBM Watson for review. Even if it is a little limited, Evernote does have an export feature that can used to export your notes to multiple HTML files or a single proprietary `.enex` file. After trying out both, I settled on exporting to the `.enex` format as it is basically a rebranded XML file.

<img src="/assets/img/ibm/xml.png" style="max-height: 300px; display: block; margin: 0 auto;" alt="xml-file" title="When I first wrote this post, I was super proud of this."/>

My first task was to get my journal entries into a single, plain text file so that I could submit to IBM Watson for review. Even if it is a little limited, Evernote does have an export feature that can used to export your notes to multiple HTML files or a single proprietary `.enex` file. After trying out both, I settled on exporting to the `.enex` format as it is basically a rebranded XML file.

So upon further inspection of the exported journal.enex file, each individual Evernote note is wrapped in `<note></note>` tags. Along with the actual text of the note itself is a wide array of metadata that is mostly irrelevant to the current effort, so I will ignore it. The actual text of the journal entry is buried under several layers of tags in the `<en-note>` tag. Although, as the reader can quickly see, the text of the note is not merely stored in plain text, but rather formatting information is encoded in many of the more common html tags (`div`, `ul`, `li` etc.).

To extract the plain text, I wrote a little [python script](https://github.com/TimelyToga/to_text) that uses Beautiful Soup to parse through the XML tree and grab the relevant information. After getting the raw, formatting tag-filled text, I merely removed anything that was an XML tag with the regular expression `<.*?>`. After some additional cleanup, I wrote the remaining text to a file.

Bingo. Plain text.

## Analysis of IBM Watson's Profile
I then fed the output of my script directly into the User Modeling demo to score my personality based on the things that I say. Watson seems to have a certain quantity of erraticism in the numbers it puts out regarding the personality of the author. I felt a little surprised by 5–10 of the scores as they didn’t really seem to really fit with the way the I think that I function. Despite this erraticism, I do feel that there is quite a bit of truth in the assessment that Watson gave of my personality.

![all-characteristics](/assets/img/ibm/all_chars.png 'I this graph does more than any other to convince me their algorithm is full of complete horse shit')

My next immediate thought was “How can I be sure that these numbers are even remotely correct?”. The difficulty in attempting to compare the results of Watson’s profile with the results of more conventional personality tests is that Watson gives much finer grained analysis of one’s personality. Conventional personality tests don’t even kid themselves into believing that they can provide such precise detail about one’s personality, so it is kinda impossible to get unified metrics on all these stats. However, in pursuit of thoroughness, I took a couple other personality tests online in addition to asking some of my closest friends to rate me on a scale from 1–10 on some of the categories that IBM Watson scored me on [data link](https://docs.google.com/spreadsheets/d/19082wa4q8Ry5NbOjZdBqRmHQAlWKt7HTet6kRS5CK_Y/pubhtml). These extra measures are meant to provide a means to objectively judge the performance of Watson’s assessment of my personality. I will add the results as they come trickling in.

It is also probably of note that their is a distinct difference between the person that I think I am when compared with the person that others perceive me to be. Especially because the corpus of text that was used to build my personality profile was taken from my private journal entries. It would be an interesting study to compare how Watson scores my personality based on my journal entries and a corpus of my dialogue, if a sufficiently large corpus of text could be ascertained.

![myers-briggs-one](/assets/img/ibm/mb_1.png 'They tell me the vast majority of CEOs are ENTJ')

I took the Humanmetrics Jung Typology Test (pictured left) [results link](http://www.humanmetrics.com/personality/entj-type?EI=1&SN=-12&TF=38&JP=11). It was a 72 question test that I doubted strongly until it’s results were so strongly corroborated by [another personality test](https://www.16personalities.com/free-personality-test) based off Myers-Briggs offered by 16 Personalities (results pictured below). The [Myers-Briggs personality test](https://en.wikipedia.org/wiki/Myers%E2%80%93Briggs_Type_Indicator) is somewhat of an industry standard in measuring personality. Although the test self-ascribes itself to be a indicator of how people perceive and interact with the world and not necessarily their personality (as it is classically perceived).

![myers-briggs-two](/assets/img/ibm/mb_2.png 'Consistency is key')

It is difficult to interpolate the sparse results from these sub-100 question tests to the 52 traits that Watson rated me on, but there are a couple points that can be compared rather directly. All tests seem to agree that I am not quite an introvert or an extravert. Watson scored me as a 46% on the Extraversion scale which very closely aligns with the results from the pseudo-Myers-Briggs tests.

Both MB tests agree on their designation of me as a ENTJ which is a rather stringent leader type. While some of the ratings that Watson gives could be used to support this claim: high uncompromising (85%), moderate trust (59%), extremely high challenge (100%), moderate cautiousness (54%), others seem to provide evidence in the opposite direction. My moderately low assertiveness score (35%), high susceptibility to stress (94%), high self consciousness (86%), and low self-discipline (6%) all seem to chip away at my ability to be a great leader. It is of course difficult to judge these two very different assessments of personality on the same scale, but differences such as this make it difficult to trust Watson’s results entirely.

As I mentioned previously, I asked some of my close friends to rate me on sixteen of the categories of that Watson scored me on. The results of that test can be found [here](https://docs.google.com/spreadsheets/d/19082wa4q8Ry5NbOjZdBqRmHQAlWKt7HTet6kRS5CK_Y/pubhtml). After a quick naïve analysis of the results, it appears that the ratings given by my friends and those given by Watson are entirely uncorrelated, but after closer inspection I found that they are only mostly entirely uncorrelated. By the very nature of statistical analysis it is unsound to compare only the elements of a set that correlate closely with one another, even if wonderful, non-mathematical rational can be provided for why it should be so. The average difference between my friends ratings and Watson’s ratings is 32 points with a Standard Deviation of 20.4 points. When furthermore compared with a correlation coefficient that is negligible, it can be determined that a useful comparison can’t be made. Of course the ratings provided by my friends are far more likely to be erratic and error-prone, but it is troubling that there is simply no correlation between the two sets of ratings.

## Evolution of Emotionality
The final leg in my analysis of my personality was to track the evolution of my personality over time. I have kept a digital journal for going on four years now in which I have written a total of over 82,000 words in 308 distinct journal entries. Because the corpus is so large, I feel rather comfortable in assuming that my results will not be inaccurate if I divide it into several discrete pieces to provide the axis of time in this study.

It is probably worth mentioning that when I stared journaling in 2011, I was just starting my junior year in high school. My digital record, therefore, tracks my transition from high school to college and more importantly, follows me during a period of intense individualization. Since I have started journaling, I have decided who I really wish to become and have made grand strides into becoming that person. So this is an excellent circumstance to test Watson’s ability’s to passively discern personality.

In order to properly study my evolution, I chopped up the corpus of my journal entries by the calendar year. I then fed each discrete segment into Watson’s User Modeling demo to ascertain the various levels of the measured characteristics at each stage. I published the [raw data](https://docs.google.com/spreadsheets/d/1OdTlYdxKEijrQ7Dr0mobq6jZBma1NiyCptSnJjf6WH8/pubhtml) from these tests online for your viewing pleasure. It is also worth noting that only 2% of of my journal was written in 2011, so it doesn’t offer really the richest set of data points. Despite the limited scope of this segment, I do think that my writing is pretty indicative of my emotional state at the time.

![words-written-in-journal-each-year](/assets/img/ibm/words_written.png 'I had a lot to say in 2012')

I then decided to see if I could uncover any underlying trends over time. My first intuition was to plot all 52 elements over the full interval and see if I could discern any trends, but instead I was presented with a rat’s nest of lines that is pictured below. Although in this amalgamation of colored lines it can be sort of determined that my personality profile tends to favor the extremes of the scale. I’m guessing this is an artifact of an imperfect algorithm present in Watson, but it may very well be that my personality in particular favors the extremes. Another accompanying conjecture is that there seem to be two basic trends away from the middle of the scale, until 2014 when the traits at the lower end of the scale fan out again.

![All-characters over time](/assets/img/ibm/chars_over_time.png 'All characteristics over time')

With my recent failure in mind, I decided to see if I I then wanted to see if there were actually any trends that manifested themselves over time. In order to do this, I calculated the linear correlation coefficients for each characteristic and then grabbed the eight that both decreased and increased the most over the interval.

![Most Negative Changes](/assets/img/ibm/most_neg.png) ![Most Positive Changes](/assets/img/ibm/most-pos.png)

I would like to think that as I have gotten older I have become a better person, so it was somewhat alarming to realize that all of the characteristics that decreased the most were fundamentally positive attributes. However, I think that I may be redeemed in that only three of the characteristics that increased the most were fundamentally negative attributes. What I also found worthy of note is that the negative changes are far more dramatic than the positive ones and that most of the negative changes occur between 2012 and 2013 (when I graduated high school / entered college). It seems that certain characteristics that I held when I was younger simply did not remain part of my personality after I transitioned to college. On the other hand, my strongest characteristics seem to have had relatively high scores all along and only strengthened as I entered college / matured.

So not that my anecdotal experience should be extrapolated to the whole of humanity, but it has been eye-opening to see how an “objective” source has evaluated my personality at different points in my life. Looking back, I feel like I mostly still the same person as I was in 2011. Older and more experienced now with a new set of ambitions and goals, but mostly still the same person. However, Watson seems to think that I have undergone pretty notable personality changes. That I have at least figured out who I want to be, and undergone marked evolution in my approach on that ideal (read: probably not ideal) version of myself.


