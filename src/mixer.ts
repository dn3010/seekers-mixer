import assert from "assert";
import { ethers } from "ethers";
import fs from "fs";
import moment from "moment";
import { consoleLogger, noopLogger } from "./logger";

export const UNKNOWN = "unknown";
export type BeaconType = "unknown" | "Standard" | "Rare" | "Mythic" | "Ultra";

/* eslint-disable @typescript-eslint/no-non-null-assertion  */

// allocate new token ids for a given beacon type.
// takes in a list of currentTokens, range and beacon. 
// It return a new list of currentTokens and the list of new tokenIds allocated.
export async function mixBeacons(seed: string, currentTokens: BeaconType[], range: number, beacon: BeaconType): Promise<BeaconType[]> {
    //count nuber of un knowns in the current list of tokens
    const totalUnknown = currentTokens.reduce(sumUp(UNKNOWN), 0);
    const unknownList = new Array(totalUnknown - range).fill(UNKNOWN) as BeaconType[];
    const beaconList = new Array(range).fill(beacon).concat(unknownList);
    //yes baby -  we shuffle 3 times :)
    const shuffled = shuffle(seed, shuffle(seed, shuffle(seed, beaconList)));
    return mergeLists(currentTokens, shuffled);
}

export function mergeLists(currentTokens: BeaconType[], beaconList: BeaconType[]): BeaconType[] {
    let beaconListIndex = 0;
    return currentTokens.map((currentV: BeaconType, index: number) => {
        if (currentV !== UNKNOWN ) {
            return currentV;
        }
        return beaconList[beaconListIndex++]!;
    });
}

//shuffle a list using the seed provided.
function shuffle(seed: string, list: BeaconType[]): BeaconType[] {
    let currentIndex = list.length;
    while (currentIndex != 0) {
        const hash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
            ['bytes', 'uint256'],
            [
                Buffer.from(seed),
                Buffer.from(ethers.BigNumber.from(currentIndex).toHexString().slice(2)),
            ]
        ));
        const seededIndex = ethers.BigNumber.from(hash).mod(list.length).toNumber();
        currentIndex--;
        [list[currentIndex], list[seededIndex]] = [
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            list[seededIndex]!, list[currentIndex]!];
    }
    return list;
}

export function fillUnknown(list: BeaconType[], value: BeaconType): BeaconType[] {
    return list.map(current => {
        if (current === UNKNOWN) {
            return value;
        }
        return current;
    })
}

export function sumUp(match: string): (s: number, v: string) => number {
    return (sum, value) => {
        if (match === value) {
            sum++;
        }
        return sum;
    }
}


async function revealStandardBeacons(blockNumber:number, logger = noopLogger) {
    logger.info("revealStandardBeacons - blockNumber:", blockNumber);

    const qtd = 25619;
    const remaining = 22276;
    const beaconType = "Standard";

    const provider = new ethers.providers.JsonRpcProvider(process.env.ETH_ENDPOINT);
    const block = await provider.getBlock(blockNumber);
    if(!block) {
        logger.error(`Could not find block number: ${blockNumber}`);
        const latest = await provider.getBlock("latest");
        logger.info(`Latest block number: ${latest.number}`);
        return;
    }
    const seed = block.hash;

    let list = new Array(47895).fill(UNKNOWN) as BeaconType[];

    //mix standards beacons
    list = await mixBeacons(seed, list, qtd, beaconType);
    const totalStandard = list.reduce(sumUp(beaconType), 0);
    assert.equal(totalStandard, qtd);
    assert.equal(list.reduce(sumUp(UNKNOWN), 0), remaining);

    const output = {
        datetime: moment().format("dddd, MMMM Do YYYY, h:mm:ss a"),
        blockHash: seed.toString(),
        blockNumber: block.number,
        totalStandard,
        tokens: list.map((beacon, index) => ({ tokenId:index+1, beacon })),
    };
    fs.mkdirSync("./reveal");
    fs.writeFileSync("reveal/Standard_Reveal.json", JSON.stringify(output));
}

async function revealRareBeacons(blockNumber:number, logger = noopLogger) {
    logger.info("revealRareBeacons - blockNumber:", blockNumber);
    const qtd = 13651;
    const remaining = 8625;
    const beaconType = "Rare";

    const provider = new ethers.providers.JsonRpcProvider(process.env.ETH_ENDPOINT);
    const block = await provider.getBlock(blockNumber);
    const seed = block.hash;

    //load data from previous run
    const {tokens, totalStandard, standardCID} = JSON.parse(fs.readFileSync("reveal/Standard_Reveal.json").toString()) as {
        tokens:{beacon:string, tokenId:number}[];
        totalStandard: number;
        standardCID:string;
    };

    let list = tokens.map(({beacon}) => beacon) as BeaconType[];

    //mix Rare beacons
    list = await mixBeacons(seed, list, qtd, beaconType);
    const totalRare = list.reduce(sumUp(beaconType), 0);
    assert.equal(totalRare, qtd);
    assert.equal(list.reduce(sumUp("Standard"), 0), totalStandard);
    assert.equal(list.reduce(sumUp(UNKNOWN), 0), remaining);

    const output = {
        datetime: moment().format("dddd, MMMM Do YYYY, h:mm:ss a"),
        blockHash: seed.toString(),
        blockNumber: block.number,
        standardCID,
        totalStandard,
        totalRare,
        tokens: list.map((beacon, index) => ({ tokenId:index+1, beacon }))
    };

    fs.writeFileSync("reveal/Rare_Reveal.json", JSON.stringify(output));
}

async function finalReveal(blockNumber:number, logger = noopLogger) {
    logger.info("finalReveal - blockNumber:", blockNumber);

    const mythicQtd = 6439;
    const ultraQtd = 2186;
    const remaining = 0;

    const provider = new ethers.providers.JsonRpcProvider(process.env.ETH_ENDPOINT);
    const block = await provider.getBlock('latest');
    const seed = block.hash;

    const {tokens, totalStandard, totalRare} = JSON.parse(fs.readFileSync("reveal/Rare_Reveal.json").toString()) as {
        tokens:{beacon:string, tokenId:number}[];
        totalStandard: number;
        totalRare: number;
        standardCID:string;
    };

    const previousTokens = tokens.map(({beacon}) => beacon) as BeaconType[];

    //mix Rare beacons
    const mythicList = await mixBeacons(seed, previousTokens, mythicQtd, "Mythic");

    const finalList = await fillUnknown(mythicList, "Ultra");

    const totalMythic = finalList.reduce(sumUp("Mythic"), 0);
    assert.equal(totalMythic, mythicQtd);

    const totalUltra = finalList.reduce(sumUp("Ultra"), 0);
    assert.equal(totalUltra, ultraQtd);

    //make sure no other beacon type is affected
    assert.equal(finalList.reduce(sumUp("Standard"), 0), totalStandard);
    assert.equal(finalList.reduce(sumUp("Rare"), 0), totalRare);
    assert.equal(finalList.reduce(sumUp(UNKNOWN), 0), remaining);
    
    const output = {
        datetime: moment().format("dddd, MMMM Do YYYY, h:mm:ss a"),
        blockHash: seed.toString(),
        blockNumber: block.number,
        totalStandard,
        totalRare,
        totalMythic,
        totalUltra,
        tokens: finalList.map((beacon, index) => ({ tokenId:index+1, beacon }))
    };

    fs.writeFileSync("reveal/Final_Reveal.json", JSON.stringify(output));
}

//standard beacon reveal
void revealStandardBeacons(14497878, consoleLogger);


