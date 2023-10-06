<script lang="ts">
  export let href: string;
  export let title: string;
</script>

<!-- Active: "bg-gray-100", Not Active: "" -->
<a {href} on:click class="block px-4 py-2 text-sm text-gray-300" role="menuitem" tabindex="-1" id="user-menu-item-0"
  >{title}</a
>
