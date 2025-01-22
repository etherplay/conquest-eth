<script lang="ts">
  export let timestamp: number;
  export let duration: number;
  export let title: string;
  export let description: string | undefined;
  export let url: string | undefined;
  export let location: string | undefined;

  import AddToCalendarGoogle from './AddToCalendarGoogle.svelte';
  // import AddToCalendarYahoo from './AddToCalendarYahoo.svelte';
  import AddToCalendarOutlook from './AddToCalendarOutlook.svelte';
  import AddToCalendarICS from './AddToCalendarICS.svelte';
</script>

<div class="flex flex-row justify-around">
  <AddToCalendarGoogle {timestamp} {duration} {title} {description} {location} />
  <!-- <AddToCalendarYahoo {timestamp} {duration} {title} {description} {location} /> -->
  <AddToCalendarICS {timestamp} {duration} {title} {url} {description} {location} />
  <!-- <AddToCalendarOutlook {timestamp} {duration} {title} {description} {location} /> -->
</div>
