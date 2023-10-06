<script lang="ts">
  import {base} from '$app/paths';
  import NavButton from '$lib/components/navigation/NavButton.svelte';
</script>

<!-- <style>
  /* purgecss start ignore */
  /* Markdown Styles */
  /* Global */
  .markdown {
    @apply leading-relaxed text-sm;
  }

  @screen sm {
    .markdown {
      @apply text-base;
    }
  }

  @screen lg {
    .markdown {
      @apply text-lg;
    }
  }

  /* Headers */
  .markdown h1,
  .markdown h2 {
    @apply text-xl my-6 font-semibold;
  }
  .markdown h3,
  .markdown h4,
  .markdown h5,
  .markdown h6 {
    @apply text-lg my-3 font-semibold;
  }

  @screen sm {
    .markdown h1,
    .markdown h2 {
      @apply text-2xl;
    }
    .markdown h3,
    .markdown h4,
    .markdown h5,
    .markdown h6 {
      @apply text-xl;
    }
  }

  /* Links */
  .markdown a {
    @apply text-blue-600;
  }
  .markdown a:hover {
    @apply underline;
  }
  /* Paragraph */
  .markdown p {
    @apply mb-4;
  }
  /* Lists */
  .markdown ul,
  .markdown ol {
    @apply mb-4 ml-8;
  }
  .markdown li > p,
  .markdown li > ul,
  .markdown li > ol {
    @apply mb-0;
  }
  .markdown ol {
    @apply list-decimal;
  }
  .markdown ul {
    @apply list-disc;
  }
  /* Blockquotes */
  .markdown blockquote {
    @apply p-2 mx-6 bg-gray-100 mb-4 border-l-4 border-gray-400 italic;
  }
  .markdown blockquote > p {
    @apply mb-0;
  }
  /* Tables */
  .markdown td,
  .markdown th {
    @apply px-2 py-1 border border-gray-400;
  }
  .markdown tr:nth-child(odd) {
    @apply bg-gray-100;
  }
  .markdown table {
    @apply mb-6;
  }

  /* Wrap any inline highlights `that are really long`, but don't modify
   the setting for codeblocks (inside ```), which are rendered in as:
   <pre><code>...
*/
  .markdown :not(pre) > code.language-text {
    white-space: pre-line;
  }
  /* purgecss end ignore */
</style> -->

<div class="w-full h-full bg-black">
  <NavButton label="Back To Game" href={`${base}/`}>Back To Game</NavButton>

  <p>
    Documentation can be found <a
      href="https://knowledge.conquest.etherplay.io"
      class="underline text-green-500"
      target="_blank">here</a
    >
  </p>
  <!-- <div class="markdown text-white p-3">
    <h1 id="introduction">Introduction</h1>
    <p>conquest.eth is a game of strategy and diplomacy where players compete to conquer the universe.</p>
    <h1 id="the-universe">The Universe</h1>
    <p>As you explore the universe, you&#39;ll notice several things:</p>
    <ol>
      <li>each planet have different attributes</li>
      <li>some planets are not reachable (out of bound)</li>
      <li>some planets are already under the control of other players</li>
    </ol>
    <h2 id="1-planet-attributes">1. Planet Attributes</h2>
    <p>Planets have the following attributes:</p>
    <ul>
      <li>
        <p><strong>Attack</strong>: multiplier given to fleets departing from the planet</p>
      </li>
      <li>
        <p><strong>Defence</strong>: multiplier applied to the number of spaceship on the planet</p>
      </li>
      <li>
        <p><strong>Speed</strong>: speed at which fleets travel from this planet.</p>
      </li>
      <li>
        <p>
          <strong>Production</strong>: number of spaceship per hour that the planet produce when a stake is deposited.
        </p>
      </li>
      <li>
        <p><strong>Stake</strong>: number of token to stake to make the planet produce spaceships</p>
      </li>
      <li>
        <p>
          <strong>Natives</strong>: native population that need to be conquered to first acquire the planet. A staking
          action is represented as an attack of 100,000 spaceships with 10,000 attack power. Once natives are destroyed,
          they do not come back.
        </p>
      </li>
    </ul>
    <h2 id="2-expanding-universe">2. Expanding Universe</h2>
    <p>
      The bound of the reachable universe expands in 4 directions. Every time a player stake on a planet near one of the
      border, that border extends.
    </p>
    <p>
      Note that while it is not possible to stake on a planet out of the bounds, you can still send spaceship to it.
    </p>
    <h2 id="3-other-players">3. Other Players</h2>
    <p>
      Like you, other players can stake on planets. When doing so, the planet start producing spaceships. It also start
      with a number of spaceships based on the Defence and Natives attributes of the planet.
    </p>
    <p>
      You cannot stake on planet owned by other players, but you can stake on planets around it and attack the player
      from them.
    </p>
    <h1 id="actions">Actions</h1>
    <p>The game have the following actions</p>
    <ul>
      <li>
        <p>
          <strong>Staking</strong>: as explained above, this is how you can start the game and get spaceships to attack
          other. This is an action that bear a risk as other players can now attack your planet and potentially take
          back your stake. You basically send Etherplay token to the conquest.eth contract and in exchange you get a
          planet that starts producing spaceships.
        </p>
      </li>
      <li>
        <p>
          <strong>Sending Spaceships</strong>: once you have control over a planet (whether it produces or not), you can
          send spaceships from it. There are multiple scenario that we describe below. Note that while the planet state
          (number of spaceships) is known to everyone, the fleet you send have their destination completely hidden. To
          achieve this, conquest.eth uses a &quot;commit and reveal&quot; scheme that require 2 transactions. One to
          secretly send a fleet and the other to be executed once the fleet reaches destination (you have 2 hour window
          to execute it). To facilitate such system, we offer a mechanism that can automatically resolve the 2nd
          transaction for you. However it requires you to keep your computer on. Click on your icon in the rop right
          corner and select &quot;agent&quot;.
        </p>
      </li>
      <li>
        <p>
          <strong>Exiting</strong>: You can exit a planet that has a stake on it. This is the mechanism by which you are
          able to get the Etherplay token out of the game. In the current alpha, the exit time is 72 hours. When you
          perform the exit transaction, if no other players are able to capture the planets during that time, you&#39;ll
          be able to withdraw these tokens back at any time. Note that when a planet is exiting, you cannot send
          spaceships from it (you can still send spaceships
          <strong>to</strong>
          it) and so these spaceships disapear once the exit is complete.
        </p>
      </li>
      <li>
        <p>
          <strong>Withdrawing</strong>: if you succesffulyy exited planets, you can withdraw the tokens on the withdraw
          page (click on your icon on the top right corner and select &quot;withdrawals&quot;)
        </p>
      </li>
      <li>
        <p>
          <strong>Messaging Other Players</strong>: The current alpha of the game do not let you send message in game,
          but you can setup a profile and let other players reach out to you through external channel like
          <a href="https://discord.gg/Qb4gr2ekfr">discord</a>
          Having played the game internally many time, we know that diplomacy is a key strategy to succeed .
        </p>
      </li>
      <li>
        <p>
          <strong>Checking on Enemy Fleets</strong>: While as mentioned, fleets&#39;s destination are not known, it is
          possible to see when fleets (and with how many spaceships) were sent. To do so you can select any planet and
          click &quot;Enemy Fleets&quot;
        </p>
      </li>
    </ul>
    <h2 id="sending-spaceships">Sending Spaceships</h2>
    <p>As mentioned above &quot;sending spaceships&quot; include several scenarios:</p>
    <h3 id="attacking-an-active-enemy-planet">Attacking an active enemy planet</h3>
    <p>
      When you send a fleet from your planet to an enemy planet with stake (active planet) and your attack succeed
      (destroy all spaceships on the enemy planet), you basically take over the control of that planet. That planet will
      still have the stake on it and will thus continue to produce spaceships for you. You can also exit the planet to
      be able to withdraw the token after the 72 hours exit period.
    </p>
    <h3 id="attacking-an-non-active-enemy-planet">Attacking an non-active enemy planet</h3>
    <p>
      When you send a fleet to an enemy planet that do not have stake on it (and so do not produce spaceships) and your
      attack succeed, you take over the control of that planer but you do not have access to any stake. Plus this planet
      will still not produce any spaceships.
    </p>
    <h3 id="attacking-an-virgin-planet">Attacking an virgin planet</h3>
    <p>
      When you send a fleet to a planet that was never touched by anyone, you ll have to fight against the native
      poulation there. If your attack succeed (which is always do as the UI prevent you from wasting spaceships), you
      get to take control of the planet but it will not start producing. Only when you add a stake to it, will it start
      doing so.
    </p>
    <h3 id="sending-spaceships-to-one-of-your-planet">Sending Spaceships to one of your planet</h3>
    <p>When you send a fleet to one of your planet, the spaceships will be added to the other planet&#39;s total.</p>
  </div> -->
</div>
