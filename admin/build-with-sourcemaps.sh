#!/bin/bash

set -e

# WARNING! EXPERIMENTAL

if [ "$1" ]
then
	dest="$(readlink -f "$1")"
	read -p "Will output files to: $dest
(Press Enter)" >&2
fi

cd -- "`dirname -- "${BASH_SOURCE:?}"`"
cd ..

merge_files () {
	echo "Creating $1" >&2
	echo "-------------------" >&2
	
	files=`grep -Po "$2" index.html`
	
	printf '{"version":3,"sections":[{"offset":{"column":0,"line":0},"map":{"version":3,"sources":["???"],"mappings":"AAAA"}}' >"$1".map
	
	declare -i total=1
	for file in ${files[@]}; do
		printf ',{"offset": {"column":0,"line":%s},"map":{"version":3,"sourceRoot":"_source","sources":["%s"],"mappings":"AAAA' $total $file
		length=`wc -l <"$file"`
		printf '%s\tL:%d\n' $file $length >&2
		yes ';AACA' | head -n $length | tr -d '\n'
		printf '"}}'
		total+=$length
		mkdir -p resource/_source/"$(dirname "$file")" >&2
		cp $file resource/_source/$file >&2
	done >>"$1".map
	
	printf ']}' >>"$1".map
	
	echo "$3" >"$1"
	cat ${files[@]} >>"$1"
	
	echo "===================" >&2
}

merge_files resource/_build.js '<script .*\bsrc=\K[\w/.-]+(?=>)' '"use strict"//# sourceMappingURL=_build.js.map'

merge_files resource/_build.css '<link .*\brel=stylesheet href=\K[\w/.-]+(?=>)' '/*# sourceMappingURL=_build.css.map */'

echo 'Creating _build.html' >&2
# nocache filename -> filename?1234567 (uses date modified)
nocache () {
	printf "$1?" ; date -r "$1" +%s
}
commit="$( git log -1 --format='%h [%ad] %s' | sed 's@[`$\\]@\\&@g' )"
inject="<!--**********************************************-->\\
<script>window.COMMIT = \`$commit\`</script>\\
<link rel=stylesheet href=$(nocache resource/_build.css)>\\
<script src=$(nocache resource/_build.js)></script>\\
<!--**********************************************-->"
sed "/<!--START-->/,/<!--END-->/c $inject" index.html > _build.html

if [ "$1" ]
then
	echo 'Copying files' >&2
	mkdir -vp "$dest"
	cp -v -u -r resource "$dest"/
	cp -v -u _build.html "$dest"/index.html
fi