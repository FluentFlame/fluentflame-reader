# Releases

Want to know how to release a new version?

## Major/Minor/Patch Releases

```bash
# Choose accordingly...
npm version major -m 'Bump to %s'
npm version minor -m 'Bump to %s'
npm version patch -m 'Bump to %s'
```

## Developer Releases

To do a new dev-release, run the following `npm` command:

```bash
npm version --preid dev -m 'Bump to %s'
```

Push these up the main repository. NOTE, doing so requires the uploader to
have push bypass to get around branch protections.

## Updating the GitHub Release

The GitHub releases are handled by our GitHub actions workflow to ensure we
have reproducible builds.

1. Once you have pushed up the commit to default branch (`master` in our case),
   click the "Create New Release" button.
2. Select the tag we just pushed up.
3. Set the title to the tag name, write description, and publish.
