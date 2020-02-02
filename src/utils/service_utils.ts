import {
    MarketBuySwapQuote,
    MarketSellSwapQuote,
    SignedOrder,
} from '@0x/asset-swapper';
import { assetDataUtils } from '@0x/order-utils';
import { AbiEncoder, BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';

import { CHAIN_ID, FEE_RECIPIENT_ADDRESS } from '../config';
import { DEFAULT_TOKEN_DECIMALS } from '../constants';
import { logger } from '../logger';
import { orderUtils } from '../utils/order_utils';
import { findTokenDecimalsIfExists } from '../utils/token_metadata_utils';

export const serviceUtils = {
    // tslint:disable-next-line:prefer-function-over-method
    attributeSwapQuoteOrders(
        swapQuote: MarketSellSwapQuote | MarketBuySwapQuote,
    ): MarketSellSwapQuote | MarketBuySwapQuote {
        // Where possible, attribute any fills of these orders to the Fee Recipient Address
        const attributedOrders = swapQuote.orders.map(o => {
            try {
                const decodedAssetData = assetDataUtils.decodeAssetDataOrThrow(o.makerAssetData);
                if (orderUtils.isBridgeAssetData(decodedAssetData)) {
                    return {
                        ...o,
                        feeRecipientAddress: FEE_RECIPIENT_ADDRESS,
                    };
                }
                // tslint:disable-next-line:no-empty
            } catch (err) {}
            // Default to unmodified order
            return o;
        });
        const attributedSwapQuote = {
            ...swapQuote,
            orders: attributedOrders,
        };
        return attributedSwapQuote;
    },

    // tslint:disable-next-line:prefer-function-over-method
    cleanSignedOrderFields(orders: SignedOrder[]): SignedOrder[] {
        return orders.map(o => ({
            chainId: o.chainId,
            exchangeAddress: o.exchangeAddress,
            makerAddress: o.makerAddress,
            takerAddress: o.takerAddress,
            feeRecipientAddress: o.feeRecipientAddress,
            senderAddress: o.senderAddress,
            makerAssetAmount: o.makerAssetAmount,
            takerAssetAmount: o.takerAssetAmount,
            makerFee: o.makerFee,
            takerFee: o.takerFee,
            expirationTimeSeconds: o.expirationTimeSeconds,
            salt: o.salt,
            makerAssetData: o.makerAssetData,
            takerAssetData: o.takerAssetData,
            makerFeeAssetData: o.makerFeeAssetData,
            takerFeeAssetData: o.takerFeeAssetData,
            signature: o.signature,
        }));
    },

    async fetchTokenDecimalsIfRequiredAsync(tokenAddress: string, web3Wrapper: Web3Wrapper): Promise<number> {
        // HACK(dekz): Our ERC20Wrapper does not have decimals as it is optional
        // so we must encode this ourselves
        let decimals = findTokenDecimalsIfExists(tokenAddress, CHAIN_ID);
        if (!decimals) {
            const decimalsEncoder = new AbiEncoder.Method({
                constant: true,
                inputs: [],
                name: 'decimals',
                outputs: [{ name: '', type: 'uint8' }],
                payable: false,
                stateMutability: 'view',
                type: 'function',
            });
            const encodedCallData = decimalsEncoder.encode(tokenAddress);
            try {
                const result = await web3Wrapper.callAsync({ data: encodedCallData, to: tokenAddress });
                decimals = decimalsEncoder.strictDecodeReturnValue<BigNumber>(result).toNumber();
                logger.info(`Unmapped token decimals ${tokenAddress} ${decimals}`);
            } catch (err) {
                logger.error(`Error fetching token decimals ${tokenAddress}`);
                decimals = DEFAULT_TOKEN_DECIMALS;
            }
        }
        return decimals;
    },
};
