# Introduction

conquest.eth is a game of strategy and diplomacy where players compete to conquer the universe.

# The Universe

As you explore the universe, you'll notice several things:

1. each planet have different attributes
2. some planets are not reachable (out of bound)
3. some planets are already under the control of other players

## 1. Planet Attributes

Planets have the following attributes:

- **Attack**: multiplier given to fleets departing from the planet

- **Defence**: multiplier applied to the number of spaceship on the planet

- **Speed**: speed at which fleets travel from this planet.

- **Production**: number of spaceship per hour that the planet produce when a stake is deposited.

- **Stake**: number of token to stake to make the planet produce spaceships

- **Natives**: native population that need to be conquered to first acquire the planet. A staking action is represented as an attack of 100,000 spaceships with 10,000 attack power. Once natives are destroyed, they do not come back.

## 2. Expanding Universe

The bound of the reachable universe expands in 4 directions. Every time a player stake on a planet near one of the border, that border extends.

Note that while it is not possible to stake on a planet out of the bounds, you can still send spaceship to it.

## 3. Other Players

Like you, other players can stake on planets. When doing so, the planet start producing spaceships. It also start with a number of spaceships based on the Defence and Natives attributes of the planet.

You cannot stake on planet owned by other players, but you can stake on planets around it and attack the player from them.

# Actions

The game have the following actions

- **Staking**: as explained above, this is how you can start the game and get spaceships to attack other. This is an action that bear a risk as other players can now attack your planet and potentially take back your stake. You basically send Etherplay token to the conquest.eth contract and in exchange you get a planet that starts producing spaceships.

- **Sending Spaceships**: once you have control over a planet (whether it produces or not), you can send spaceships from it. There are multiple scenario that we describe below.
  Note that while the planet state (number of spaceships) is known to everyone, the fleet you send have their destination completely hidden.
  To achieve this, conquest.eth uses a "commit and reveal" scheme that require 2 transactions. One to secretly send a fleet and the other to be executed once the fleet reaches destination (you have 2 hour window to execute it). To facilitate such system, we offer a mechanism that can automatically resolve the 2nd transaction for you. However it requires you to keep your computer on. Click on your icon in the rop right corner and select "agent".

- **Exiting**: You can exit a planet that has a stake on it. This is the mechanism by which you are able to get the Etherplay token out of the game. In the current alpha, the exit time is 72 hours. When you perform the exit transaction, if no other players are able to capture the planets during that time, you'll be able to withdraw these tokens back at any time.
  Note that when a planet is exiting, you cannot send spaceships from it (you can still send spaceships **to** it) and so these spaceships disapear once the exit is complete.

- **Withdrawing**: if you succesffulyy exited planets, you can withdraw the tokens on the withdraw page (click on your icon on the top right corner and select "withdrawals")

- **Messaging Other Players**: The current alpha of the game do not let you send message in game, but you can setup a profile and let other players reach out to you through external channel like [discord](https://discord.gg/Qb4gr2ekfr)
  Having played the game internally many time, we know that diplomacy is a key strategy to succeed .

- **Checking on Enemy Fleets**: While as mentioned, fleets's destination are not known, it is possible to see when fleets (and with how many spaceships) were sent. To do so you can select any planet and click "Enemy Fleets"

## Sending Spaceships

As mentioned above "sending spaceships" include several scenarios:

### Attacking an active enemy planet

When you send a fleet from your planet to an enemy planet with stake (active planet) and your attack succeed (destroy all spaceships on the enemy planet), you basically take over the control of that planet. That planet will still have the stake on it and will thus continue to produce spaceships for you. You can also exit the planet to be able to withdraw the token after the 72 hours exit period.

### Attacking an non-active enemy planet

When you send a fleet to an enemy planet that do not have stake on it (and so do not produce spaceships) and your attack succeed, you take over the control of that planer but you do not have access to any stake. Plus this planet will still not produce any spaceships.

### Attacking an virgin planet

When you send a fleet to a planet that was never touched by anyone, you ll have to fight against the native poulation there. If your attack succeed (which is always do as the UI prevent you from wasting spaceships), you get to take control of the planet but it will not start producing. Only when you add a stake to it, will it start doing so.

### Sending Spaceships to one of your planet

When you send a fleet to one of your planet, the spaceships will be added to the other planet's total.
