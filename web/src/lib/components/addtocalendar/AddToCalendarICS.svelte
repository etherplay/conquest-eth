<script lang="ts">
  export let timestamp: number;
  export let duration: number;
  export let title: string;
  export let description: string | undefined;
  export let url: string | undefined;
  export let location: string | undefined;

  import {toISOURL} from './dateutils';
  import {saveAs} from '$lib/utils/FileSaver';

  const startDateTime = toISOURL(timestamp);
  const endDateTime = toISOURL(timestamp + duration);
  const jsonEncodedDescription = description ? JSON.stringify(description) : '';
  const encodedDescription = description ? jsonEncodedDescription.substr(1, jsonEncodedDescription.length - 2) : '';

  const ics = `
BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
BEGIN:VEVENT
DTSTART:${startDateTime}
DTEND:${endDateTime}
SUMMARY:${title}
URL:${url || ''}
DESCRIPTION:${encodedDescription || ''}
LOCATION:${location || ''}
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:${encodedDescription || ''}
TRIGGER:-PT0M
END:VALARM
END:VEVENT
END:VCALENDAR
`;

  const blob = new Blob([ics], {type: 'text/plain;charset=utf-8'});
</script>

<button
  class="block border border-green-400 p-2"
  on:click={() => saveAs(blob, `conquest-eth_${startDateTime}.ics`, undefined, undefined)}
>
  <span class="flex flex-row">
    <svg class="w-6 h-6 mx-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
      />
    </svg>
    ICS
  </span>
</button>
