/* eslint-disable @typescript-eslint/no-explicit-any */
export function getParamsFromURL(url: string): {params: Record<string, string>; pathname?: string} {
  if (!url) {
    return {params: {}, pathname: ''};
  }
  const obj: Record<string, string> = {};
  const hash = url.lastIndexOf('#');

  let cleanedUrl = url;
  if (hash !== -1) {
    cleanedUrl = cleanedUrl.slice(0, hash);
  }

  const question = cleanedUrl.indexOf('?');
  if (question !== -1) {
    cleanedUrl
      .slice(question + 1)
      .split('&')
      .forEach((piece) => {
        const [key, val = ''] = piece.split('=');
        obj[decodeURIComponent(key)] = val === '' ? 'true' : decodeURIComponent(val);
      });
  }

  let pathname = cleanedUrl.slice(0, question) || '';
  if (pathname && !pathname.endsWith('/')) {
    pathname += '/';
  }
  return {params: obj, pathname};
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function getParamsFromLocation(): {params: Record<string, string>; pathname?: string} {
  if (typeof window === 'undefined') {
    return {params: {}};
  }
  return getParamsFromURL(window.location.href);
}

export function getHashParamsFromLocation(str?: string): Record<string, string> {
  if (typeof window === 'undefined') {
    return {};
  }
  const url = str || window.location.hash;
  const obj: Record<string, string> = {};
  const hash = url.lastIndexOf('#');

  if (hash !== -1) {
    url
      .slice(hash + 1)
      .split('&')
      .forEach((piece) => {
        const [key, val = ''] = piece.split('=');
        obj[decodeURIComponent(key)] = decodeURIComponent(val);
      });
  }
  return obj;
}

export function queryStringifyNoArray(query: Record<string, string>): string {
  let str = '';
  for (const key of Object.keys(query)) {
    const value = query[key];
    str += `${str === '' ? '?' : '&'}${key}=${value}`;
  }
  return str;
}

export function rebuildLocationHash(hashParams: Record<string, string>): void {
  if (typeof window === 'undefined') {
    return;
  }
  let reconstructedHash = '';
  Object.entries(hashParams).forEach((param) => {
    if (reconstructedHash === '') {
      reconstructedHash += '#';
    } else {
      reconstructedHash += '&';
    }
    reconstructedHash += param.join('=');
  });

  if ('replaceState' in window.history) {
    window.history.replaceState(
      '',
      document.title,
      window.location.pathname + window.location.search + reconstructedHash
    );
  } else {
    // Prevent scrolling by storing the page's current scroll offset
    const {scrollTop, scrollLeft} = document.body;
    window.location.hash = '';

    // Restore the scroll offset, should be flicker free
    document.body.scrollTop = scrollTop;
    document.body.scrollLeft = scrollLeft;
  }
}

async function chrome76Detection(): Promise<boolean> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const {quota} = await navigator.storage.estimate();
    return quota !== undefined && quota < 120000000;
  }
  return false;
}

function isNewChrome(): boolean {
  const pieces = navigator.userAgent.match(/Chrom(?:e|ium)\/([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)/);
  if (pieces === null || pieces.length !== 5) {
    return false;
  }
  const major = pieces.map((piece) => parseInt(piece, 10))[1];
  return major >= 76;
}

export function isPrivateWindow(): Promise<boolean | null> {
  return new Promise((resolve) => {
    try {
      const isSafari =
        navigator.vendor &&
        navigator.vendor.indexOf('Apple') > -1 &&
        navigator.userAgent &&
        navigator.userAgent.indexOf('CriOS') === -1 &&
        navigator.userAgent.indexOf('FxiOS') === -1;

      if (isSafari) {
        // Safari
        let e = false;
        if ((window as any).safariIncognito) {
          e = true;
        } else {
          try {
            (window as any).openDatabase(null, null, null, null);
            window.localStorage.setItem('test', '1');
            resolve(false);
          } catch (err) {
            e = true;
            resolve(true);
          }
          // eslint-disable-next-line no-unused-expressions, no-void
          void !e && ((e = !1), window.localStorage.removeItem('test'));
        }
      } else if (navigator.userAgent.includes('Firefox')) {
        // Firefox
        const db = indexedDB.open('test');
        db.onerror = () => {
          resolve(true);
        };
        db.onsuccess = () => {
          resolve(false);
        };
      } else if (
        navigator.userAgent.includes('Edge') ||
        navigator.userAgent.includes('Trident') ||
        navigator.userAgent.includes('msie')
      ) {
        // Edge or IE
        if (!window.indexedDB && (window.PointerEvent || window.MSPointerEvent)) {
          resolve(true);
        }
        resolve(false);
      } else {
        // Normally ORP or Chrome
        if (isNewChrome()) {
          resolve(chrome76Detection());
        }

        const fs = (window as any).RequestFileSystem || (window as any).webkitRequestFileSystem;
        if (!fs) {
          resolve(null);
        } else {
          fs(
            (window as any).TEMPORARY,
            100,
            () => resolve(false),
            () => resolve(true)
          );
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      resolve(null);
    }
  });
}

export function isMobile() {
  return (function (a) {
    return (
      /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
        a
      ) ||
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
        a.substr(0, 4)
      )
    );
  })(navigator.userAgent || (navigator as any).vendor || (window as any).opera);
}

export function isMobileOrTablet() {
  return (function (a) {
    return (
      /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(
        a
      ) ||
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
        a.substr(0, 4)
      )
    );
  })(navigator.userAgent || (navigator as any).vendor || (window as any).opera);
}

export const IAmRunningOnAMobile = typeof window !== 'undefined' && isMobile();
export const IAmRunningOnAMobileOrTablet = typeof window !== 'undefined' && isMobileOrTablet();
