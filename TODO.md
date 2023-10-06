- [ ] error report tool
- [ ] implement the sign message with blockhash of last 255 block to perform a sneak attack/gifting before reveal time is open to everyone (allowing plausible deniability until that point : I reveal my secret to my so called "allies" so they know I am sending them gift, but just before reveal of gifting is allowed by anyone, I send a signed message making the attack, 10 minute before)
- [x] sending fleet flow, show queueReveal error
- [ ] when revealTIme come check agent-service for registered queueID and show broadcast status
- [ ] Optimistic agent-serve registration and topups (later we could use pendingAction system)
- [ ] SHow list of fleets on agent-service page and allow to register them each or all
- [ ] Better agent-screen
- [ ] Handle penind gagent topup tx
- [ ] Better withdrawal screen
- [ ] Uniswap screen ?
- [ ] Farming Screen ?
- [ ] Game Reward collection screen
- [ ] Alliance Screen
- [ ] Alliance website
- [ ] Documentation for smart contract
- [x] Better event popups
- [ ] Better planet/event/fleet list : do not get under "pick origin"
- [ ] Better fleet to resolve fleet
- [ ] Better handling of clicks => planet click take precedence ? => show list of fleets ?
- [x] fix Errors acknowledgements

- [ ] "once the tx is mined" message need to be reworded when time of arrival is specified
- [x] fix zoom to see fleet
- [x] better event info, especially with cumulative attackes
- [x] show event for fleet you sent and / or fleet other send for you
- [x] PlanetElement: do not show red when no wallet connected
- [ ] FLeetElement: fix disapeating fleets when select circle is on ? ????
- [ ] drop down for allies ? when selecting owner
- [ ] drop down for fleet on same planet if reachable in time ?
- [ ] - ability to share fleets with friends ?
- [ ] RevealQueue : check if not submitting twice
- [x] fix error acknowledgement not trigged syncrhonously
- [x] show JSON rpc error message
- [x] Clean log
- [x] Memory leak ?
- [x] plugin list
- [x] Plugin marker on map + condition (like buttons), Marketplace sale => show whenver there is a sale (even if you are the owner), color ? blue ? radius ?
- [ ] WITHDRAWAL PAGE
- [ ] NEW PLANET LOGO AND TEST REWARDS
- [x] Fleet arrived event: does it need to provide more info ? (operator, sender, owner ?)

## NEW

- [x] Tax on sale: implement on fleetOwner vs sender, and destinationOwner vs fleetOwner

- [x] event for sales / sender / operator
- [ ] betrayal detection example
- [ ] Better event messages
- [ ] Show better time on selection
- [ ] Clain token page, reload on error or timeout
- [x] Make that tax visible in the UI
- [x] Show alliance icon on front
- [ ] Upkeep: event show upkeep given back ?
- [ ] Native should not display sales
- [ ] Batch resolution of fleet
- [x] Better event details
- [x] Make "Loading" faster
- [ ] Messages

# ISSUES

- [ ] when not signed in, cannot acknowledge error or event: need to either force sign-in to see (same as fleets) orat least bring a popup to sign-in
- [ ] investigate error `Reverted 0x464c4545545f444f5f4e4f545f4558495354` seems to resolved itself, when switching from sending fleet to attack that then become for you (who just captured the destination planet)

# NOTES

- [ ] buying spaceships does not make you responsible for the attack, but you get to be the new owner in case of success, this could be implemented as transfer when planet is conquered
- [ ] transfer planet ownership should be possible
