import {base} from '$app/paths';
import {getParamsFromURL, queryStringifyNoArray} from './web';
import {params, globalQueryParams} from '$lib/config';

export function url(path: string, hash?: string): string {
  const {params: paramFromPath, pathname} = getParamsFromURL(path);
  // console.log({paramFromPath, pathname});
  for (const queryParam of globalQueryParams) {
    if (typeof params[queryParam] != 'undefined' && typeof paramFromPath[queryParam] === 'undefined') {
      paramFromPath[queryParam] = params[queryParam];
    }
  }
  // console.log({paramFromPath, pathname, base, queryString: queryStringifyNoArray(paramFromPath)});
  return `${base}/${pathname}${queryStringifyNoArray(paramFromPath)}${hash ? `#${hash}` : ''}`;
}

export function relativePathname(path: string): string {
  // hmm, svelte-kit is prepending "//prerender" when using adapter-static
  if (path.startsWith('//prerender')) {
    path = path.slice(11);
  } else if (path.startsWith(base)) {
    // hmm, svelte-kit has changed its path handling, TODO : deal with it in svelte-kit-ipfs-adapter
    path = path.slice(base.length);
  }

  return path.replace(/^\/+|\/+$/g, '');
}

export function urlOfPath(url: string, path: string): boolean {
  const relPath = relativePathname(path);

  const basicUrl = url.split('?')[0].split('#')[0];
  return basicUrl.replace(base, '').replace(/^\/+|\/+$/g, '') === relPath;
}
