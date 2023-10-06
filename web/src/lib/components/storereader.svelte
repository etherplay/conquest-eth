<script lang="ts">
  import {myplanetInfos} from '$lib/space/myplanets';
  import * as config from '$lib/config';
  if (typeof window !== 'undefined') {
    (window as any).config = config;
  }
</script>

<!-- <div class="hidden">
  {$myplanetInfos.length}
</div> -->
