<script lang="ts">
  export let outcome: Outcome;

  import type {Outcome} from 'conquest-eth-common';
</script>

<p class={`${outcome.min.captured ? 'text-green-500' : 'text-red-500'}`}>
  {outcome.min.numSpaceshipsLeft}
</p>
