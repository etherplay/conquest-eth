<script lang="ts">
  export let timestamp: number;
  export let duration: number;
  export let title: string;
  export let description: string | undefined;
  export let location: string | undefined;

  import {toISOURL} from './dateutils';

  const startDateTime = toISOURL(timestamp);
  const endDateTime = toISOURL(timestamp + duration);
  const urlEncodedDescription = description || ''; // TODO
  const urlEncodedLocation = location || ''; // TODO
</script>

<a
  target="_blank"
  href={`https://calendar.yahoo.com/?desc=${urlEncodedDescription}&et=${endDateTime}&in_loc=${urlEncodedLocation}&st=${startDateTime}&title=${title}&v=60`}
  class="addToCalendar">Add to Calendar</a
>

<style>
  .addToCalendar {
    background-color: #44c767;
    border-radius: 28px;
    border: 1px solid #18ab29;
    display: inline-block;
    cursor: pointer;
    color: #ffffff;
    font-family: Arial;
    font-size: 16px;
    padding: 16px 31px;
    text-decoration: none;
    text-shadow: 0px 1px 0px #2f6627;
  }
  .addToCalendar:hover {
    background-color: #5cbf2a;
  }
  .addToCalendar:active {
    position: relative;
    top: 1px;
  }
</style>
