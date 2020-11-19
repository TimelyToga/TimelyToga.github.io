# Tim's Personal Website

### Building

`bb` is aliases to `bundle` on my computer to avoid that golang bundle command.

```
bb exec jekyll build
```

### Local Testing

```
bb exec jekyll serve --watch
```

### Create a New Page

```
bb exec jekyll compose "A Young Mind" --collection "scifi
```
