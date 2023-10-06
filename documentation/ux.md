# Conquest.eth

## Actions

### Sign-in

> In order to play conquest, a signing key need to be generated on your web browser. This is to allow the signing and encryption of your data.

- choose whether you want that secret key to be saved on your browser (trusting your machine)
- choose whether you want the data to be synced across your multiple device
- confirm
- this will trigger a wallet popup to sign (no tx involved)

### Register a Name / Messaging Key

> This is optional but allow anyone to contact you and this has to be done only once. No need to record that in browser.

- choose a name
- confirm
- this will trigger a wallet popup to sign (no tx involved)

### Register for the agent-service

> The agent-service will remove the need for the 2nd transaction when sending spaceships (See [here](#sending-spaceships-from-one-planet-to-another)) (sending spaceships require normally 2 txs, one to send and one to execute when the fleet arrive (could be days later))

- To use the agent-service you need to register, this is a signing message. This only need to be done once.
- this will trigger a wallet popup to sign (no tx involved)
- Then you need to top-up the agent with native token (ETH) for the agent to work on your behalf
- this will trigger a wallet popup to perform a tx with ETH (you thus need some ETH here)
- By default the agent-service is then activated. You can disable it

### Staking on Planets

> a.k.a. Claiming planets and make them produce spaceship for you

- Select planet (with no player on it)
- Perform transaction to claim with Etherplay token (need Etherplay token)
- Wait for tx to be mined
- Tx mined => the planet is now your and start producing spaceships, show notification.
- tx failed => show failure, acknowledge
- tx never mined => show timeout, acknowledge/retry, accept it can happen later if not overriden with another tx (could propose to send a null tx to cancel it)

### Sending Spaceships from one planet to another

> This can be attacking someone
>
> But this can also be sending spaceships to yourself from one of your planet to another
>
> Or sending spaceships to a friend (see [alliances](#join-public-alliances))

#### sending tx

- Select origin planet and destination planet
- Select amount of planet, see prediction of combat (if attacking)
- Select whether you want to use the [agent-service](#register-for-the-agent-service) for that fleet. A reason for not selecting it is that you do not trust the agent-service and want to keep that fleet secret.
- confirm
- be warned of the second tx needed
- See fleet and show that tx is pending
- tx is mined, fleet is on its way for good (fleet move on the map slowly)
- tx failed => show failure, acknowledge
- tx never mined => show timeout, acknowledge/retry, accept it can happen later if not overriden with another tx (could propose to send a null tx to cancel it)

#### resolution tx

- show arrival (when the fleet finally reaches destination, can take days)
- show when reveal tx is possible
  > note that if the agent-service is used (see [agent-service](#register-for-the-agent-service)) the reveal tx is delayed to leave time for the agent to do it automatically
- if too late, your fleet is lost in space
- if still time, allow to resolve, tx confirmation
- show that resolution is pending
- tx mined: show result, allow acknowledgement
- tx failed => show failure, acknowledge
- tx never mined => show timeout, acknowledge/retry, accept it can happen later if not overriden with another tx (could propose to send a null tx to cancel it)

### Exit Planet

- Select Planet
- perform tx to exit
- show exit pending...
- tx mined: show exit started for good
- tx failed => show failure, acknowledge
- tx never mined => show timeout, acknowledge/retry, accept it can happen later if not overriden with another tx (could propose to send a null tx to cancel it)
- show progress
- exit done, acknowledged => show withdraw balance increase
- ability to withdraw indivually or other...

### See list of your planets

- browse list
- select to go to planet on the map, selected

### See list of your fleets

- browse list
- select to go to fleet destination/origin

### See list of global events

- see all players actions and resolution
- filter per alliance

### See list of notifications (personal events)

- see all your fleet resolved/failed
- see all your planet exited/failed
- see enemies attack
- see other player spaceship gifting

### See list of players

- browse list (ordered by amount stake / token available)
- select to message player

### Contact Player

- Select planet
- send message to owner
- enter message
- ability to mention planet or even attack strategy
- confirm send

### Read Messages

- get notification of messages to read
- select message
- read
- (reply) -> see "Contact Player"

### See list of public alliances

- browse list
- select to join

### Join Public Alliances

- Select a player. select alliance
- redirect to webpage to join
- ... (the alliances should have their own web page, external to the game)

### Leave Alliances

- alliance web page (the alliances should have their own web page, external to the game)

### Sell Spaceships

> This should be fully customizable by plugin

- select planet
- (approve sell contract)
- put spaceship for sale => message

### Push Notifications

- receive notification on personal event + specific filter

## NOTES

- Show visually the difference between planet where a player has some spaceship on it but is not staking there (this could be because the player send spaceship there to get some outward protection, or because some other player exited the planet while he was sending an attack)

- change rules for exiting ? should the natives get back to the planet. If not there is danger ine xiting for planets around since a new player staking on it will have no loss and start at 100,000.
  An other idea, would be to remove native and normalise the number of starting spaceship. And for sending spaceship to virgin planet, we could either let them send without loss or keep a minimum loss ?

- show stake of players, withdrawal balance and token in wallet ?
- show exit success
