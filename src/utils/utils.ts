import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';

import { ObjectMap } from '../types';

export const utils = {
    arrayToMapWithId: <T extends object>(array: T[], idKey: keyof T): ObjectMap<T> => {
        const initialMap: ObjectMap<T> = {};
        return array.reduce((acc, val) => {
            const id = val[idKey] as any;
            acc[id] = val;
            return acc;
        }, initialMap);
    },
    convertAmountToBigNumber(value: string | number | BigNumber): BigNumber {
        const num = value || 0;
        const isBigNumber = BigNumber.isBigNumber(num);
        if (isBigNumber) {
            return num as BigNumber;
        }

        if (_.isString(num) && (num.indexOf('0x') === 0 || num.indexOf('-0x') === 0)) {
            return new BigNumber(num.replace('0x', ''), 16);
        }

        const baseTen = 10;
        return new BigNumber((num as number).toString(baseTen), baseTen);
    },
    encodeAmountAsHexString(value: string | number | BigNumber): string {
        const valueBigNumber = utils.convertAmountToBigNumber(value);
        const hexBase = 16;
        const valueHex = valueBigNumber.toString(hexBase);

        return valueBigNumber.isLessThan(0) ? `-0x${valueHex.substr(1)}` : `0x${valueHex}`;
    },
};
