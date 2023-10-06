<script>
  // from https://github.com/jacobmischka/svelte-flatpickr/blob/72744f3d63a475ea7c7ea4e0e8f1e991dd8617d6/src/Flatpickr.svelte
  import {onMount, createEventDispatcher} from 'svelte';
  import flatpickr from 'flatpickr';
  import 'flatpickr/dist/flatpickr.css';

  const hooks = new Set([
    'onChange',
    'onOpen',
    'onClose',
    'onMonthChange',
    'onYearChange',
    'onReady',
    'onValueUpdate',
    'onDayCreate',
  ]);
  export let value = undefined;
  export let formattedValue = '',
    element = null,
    dateFormat = null;
  export let options = {};
  let ready = false;
  export let input = undefined,
    fp = undefined;
  export {fp as flatpickr};
  $: if (fp && ready) {
    fp.setDate(value, false, dateFormat);
  }
  onMount(() => {
    const elem = element || input;
    const opts = addHooks(options);
    opts.onReady.push(() => {
      ready = true;
    });
    fp = flatpickr(elem, Object.assign(opts, element ? {wrap: true} : {}));
    return () => {
      fp.destroy();
    };
  });
  const dispatch = createEventDispatcher();
  $: if (fp && ready) {
    for (const [key, val] of Object.entries(addHooks(options))) {
      fp.set(key, val);
    }
  }
  function addHooks(opts = {}) {
    opts = Object.assign({}, opts);
    for (const hook of hooks) {
      const firer = (selectedDates, dateStr, instance) => {
        dispatch(stripOn(hook), [selectedDates, dateStr, instance]);
      };
      if (hook in opts) {
        // Hooks must be arrays
        if (!Array.isArray(opts[hook])) opts[hook] = [opts[hook]];
        opts[hook].push(firer);
      } else {
        opts[hook] = [firer];
      }
    }
    if (opts.onChange && !opts.onChange.includes(updateValue)) opts.onChange.push(updateValue);
    return opts;
  }
  function updateValue(newValue, dateStr, fp) {
    const mode = fp?.config?.mode ?? 'single';
    value = mode === 'single' ? newValue[0] : newValue;
    formattedValue = dateStr;
  }
  function stripOn(hook) {
    return hook.charAt(2).toLowerCase() + hook.substring(3);
  }
</script>

<div class="bg-gray-800 text-cyan-500" bind:this={element}>
  <input bind:this={input} {...$$restProps} data-input />

  <a href="/" class="input-button" title="toggle" data-toggle>
    <svg class="w-6 h-6 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
      ><path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      /></svg
    >
  </a>

  <a href="/" class="input-button" title="clear" data-clear>
    <svg
      class="w-6 h-6 inline text-red-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      ><path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      /></svg
    >
  </a>
  <slot />
</div>

<style>
  :global(.flatpickr-calendar) {
    color: black;
  }
  :global(.flatpickr-confirm) {
    cursor: pointer;
  }
  :global(.flatpickr-confirm > svg) {
    display: inline;
  }
</style>
