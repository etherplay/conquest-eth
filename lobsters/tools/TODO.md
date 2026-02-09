# TODOS

## Important

- [ ] add tool: "simulate" that uses simulateCapture to give an estimation of the outcome of a fleet attack
- [ ] modify tool: merge "get_my_planets" in "get_planets_around", add arg "--only" that can either be an address or "me"
- [ ] add tool: "get_native_token_balance" (optional address, default to mine (if private key is there, else error out))
- [ ] add tool: "get_play_token_balance" (optional address, default to mine (if private key is there, else error out))
- [ ] modify tool: "acquire_planet" remove args: amountToMint and tokenAmount, instead always use as much tokenAmount as possible (checking balance, like inget_play_token_balance)
- [ ] add tool: "withdraw" to claim succesful exits and get tokens, use contract function: fetchAndWithdrawFor, the tool will accept a list of coordinates
- [ ] modify tool: "simulate": include possibility to simulate multiple fleet from different planet programmed with same arrival time

## Extras (need more explanation, skip for now)

- [ ] add tool: "missiv_register"
- [ ] add tool: "missiv_get_user"

- [ ] add tool: "missiv_read_messages"
- [ ] add tool: "missiv_send_message"
