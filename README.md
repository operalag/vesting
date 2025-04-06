# Vesting Contract

## Overview
This smart contract manages the vesting of jettons. It enables secure and automated jetton distribution over time, supporting cliff periods and scheduled vesting.

## Storage Variables
- `admin_address`: Address of the admin.
- `claimer_address`: Address of the jetton recipient.
- `jetton_wallet_address`: Address of the vesting jetton wallet.
- `jetton_balance`: Total jetton balance under vesting.
- `jettons_claimed`: Amount of jettons already claimed.
- `last_claimed`: Timestamp of the last claim transaction.
- `cliff_end_date`: Cliff period end date.
- `cliff_numerator`: Numerator for cliff jetton unlock ratio.
- `cliff_denominator`: Denominator for cliff jetton unlock ratio.
- `cliff_unlock_amount`: Amount of jettons unlocked at the end of the cliff period.
- `vesting_period`: Amount of jettons unlocked at the end of the cliff period.
- `distribution_frequency`: Frequency of jetton distribution. 

### TL-B scheme of storage
```
_ admin_address:MsgAddressInt claimer_address:MsgAddressInt jetton_wallet_address:MsgAddressInt jetton_balance:Coins jettons_claimed:Coins last_claimed:uint32 cliff_end_date:uint32 cliff_numerator:uint16 cliff_denominator:uint16 cliff_unlock_amount:Coins vesting_period:uint32 distribution_frequency:uint32 = VestingStorage;
```

## Functionality

- `OP::CLAIM_JETTONS` allows the claimer to withdraw available jettons.

    #### TL-B scheme:
    ```
    claim_jettons#3651a88c query_id:uint64 = InternalMsgBody;
    ```
    - `query_id`: A 64-bit unsigned integer serving as the unique identifier for the request.

    If everything is correct it sends message with the following layout:
    ```
    transfer#f8a7ea5 query_id:uint64 jetton_amount:Coins destination:MsgAddressInt
                            response_destination:MsgAddressInt custom_payload:(Maybe ^Cell)
                            forward_ton_amount:Coins forward_payload:(Either Cell ^Cell) = InternalMsgBody;
    ```
    - `query_id`: A 64-bit unsigned integer serving as the unique identifier for the request.
    - `jetton_amount`: Amount of transferred jettons.
    - `destination`: Address of the recipient.
    - `response_destination`: Address where to send a response with confirmation of a successful transfer and the rest of the incoming message Toncoins.
    - `custom_payload`: Optional data from the requester, which is returned in the response for reference or additional processing.
    - `forward_ton_amount`: The amount of nanotons to be sent to the destination address.
    - `forward_payload`: Optional custom data that should be sent to the destination address.

    **Should be rejected if:**
    1. The sender's workchain ID is not equal to the basechain's workchain ID (`ERROR::NOT_BASECHAIN`).
    2. Message is not from the claimer (`ERROR::NOT_FROM_CLAIMER`).
    3. The provided message value (`msg_value`) is less than the required amount to perform the operation (`ERROR::NOT_ENOUGH_TON`).
    4. There are no claimable jettons (`ERROR::NOTHING_TO_CLAIM`).


- `OP::SEND_SERVICE_MESSAGE` allows the admin to send a custom service message once the lockup period is over.

    #### TL-B scheme:
    ```
    send_service_message#000a3c66 query_id:uint64 message:^Cell mode:uint8 = InternalMsgBody;
    ```
    - `query_id`: A 64-bit unsigned integer serving as the unique identifier for the request.
    - `message`: Message to forward.
    - `mode`: Specifies the forwarding mode of the message.

    If the conditions are met, the contract forwards the provided message with a specific forwarding mode.

    **Should be rejected if:**
    1. The sender's workchain ID is not equal to the basechain's workchain ID (`ERROR::NOT_BASECHAIN`).
    2. Message is not from the admin (`ERROR::NOT_FROM_ADMIN`).
    3. The lockup period is not finished, and the jetton balance is not zero (`ERROR::LOCKUP_NOT_FINISHED`).


### Get-methods
- `get_lockup_data`: Retrieves lockup-related information of the vesting contract.
    #### TL-B scheme:
    ```
    get_lockup_data#_ = (
        init?:Bool 
        admin_address:MsgAddressInt
        claimer_address:MsgAddressInt
        jetton_balance:Coins
        jettons_claimed:Coins
        last_claimed:uint32
    )
    ```

- `get_vesting_data`: Provides details about the vesting schedule and parameters.
    #### TL-B scheme:
    ```
    get_vesting_data#_ = (
        jetton_wallet_address:MsgAddressInt
        cliff_end_date:uint32
        cliff_numerator:uint16
        cliff_denominator:uint16
        cliff_unlock_amount:Coins
        vesting_period:uint32
        distribution_frequency:uint32
    )
    ```

- `get_claimable_jettons`: Returns the number of jettons currently available for claim.
- `get_min_fee`: Returns the minimum required fee for a transaction.