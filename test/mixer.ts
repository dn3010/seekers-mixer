import { assert } from "chai";
import { describe, it } from "mocha";
import { BeaconType, fillUnknown, mixBeacons, sumUp, UNKNOWN } from "../src/mixer";
/* eslint-disable @typescript-eslint/no-non-null-assertion  */
describe("Mixer - Beacons Reveals", () => {

    it("mixBeacons should return a list of new expected tokens", async () => {
        const seed = "0x36270d5ab846e5e10f40f66aa843db60ac76ca21dc9d153142a77fec5fc31374";
        const currentTokens: BeaconType[] = [
            UNKNOWN,
            "Standard",
            UNKNOWN,
            "Standard",
            UNKNOWN,
            UNKNOWN,
            "Standard",
            UNKNOWN,
            UNKNOWN,
            "Standard",
        ];
        const range = 6;
        const newList = await mixBeacons(seed, currentTokens, range, "Ultra");

        assert.equal(newList.length, currentTokens.length);

        assert.deepEqual(newList, [
            "Ultra",
            "Standard",
            "Ultra",
            "Standard",
            "Ultra",
            "Ultra",
            "Standard",
            "Ultra",
            "Ultra",
            "Standard",
        ]);

    }).timeout(5000);

    it("should reveal all beacons", async () => {
        let seed =  "0x76270d5ab846e5e10f40f66aa843db60ac76ca21dc9d153142a77fec5fc31374";
        //startes with all unknown
        let currentTokens = new Array(47895).fill(UNKNOWN) as BeaconType[];

        //add standards
        currentTokens = await mixBeacons(seed, currentTokens, 25619, "Standard");
        assert.equal(currentTokens.reduce(sumUp("Standard"), 0), 25619);
        assert.equal(currentTokens.reduce(sumUp(UNKNOWN), 0), 22276);

        //add Rare
        seed = "0x25270d5ab846e5e10f40f66aa843db60ac76ca21dc9d153142a77fec5fc31843";
        currentTokens = await mixBeacons(seed, currentTokens, 13651, "Rare");
        assert.equal(currentTokens.reduce(sumUp("Standard"), 0), 25619);
        assert.equal(currentTokens.reduce(sumUp("Rare"), 0), 13651);
        assert.equal(currentTokens.reduce(sumUp(UNKNOWN), 0), 8625);

        //add Mythic
        seed = "0x06745d5ab846e5e10f40f66aa843db60ac76ca21dc9d153142a77fec5fc57862";
        currentTokens = await mixBeacons(seed, currentTokens, 6439, "Mythic");
        assert.equal(currentTokens.reduce(sumUp("Standard"), 0), 25619);
        assert.equal(currentTokens.reduce(sumUp("Rare"), 0), 13651);
        assert.equal(currentTokens.reduce(sumUp("Mythic"), 0), 6439);
        assert.equal(currentTokens.reduce(sumUp(UNKNOWN), 0), 2186);

        //add Ultra
        currentTokens = fillUnknown(currentTokens, "Ultra");
        assert.equal(currentTokens.reduce(sumUp("Standard"), 0), 25619);
        assert.equal(currentTokens.reduce(sumUp("Rare"), 0), 13651);
        assert.equal(currentTokens.reduce(sumUp("Mythic"), 0), 6439);
        assert.equal(currentTokens.reduce(sumUp(UNKNOWN), 0), 0);
        assert.equal(currentTokens.reduce(sumUp("Ultra"), 0), 2186);
        assert.equal(currentTokens.reduce(sumUp(UNKNOWN), 0), 0);

        //fs.writeFileSync("test_list.txt", JSON.stringify(currentTokens));
    }).timeout(10000);

    it("should be deterministic", async () => {

        const seedsA = [
            "0x76270d5ab84oinuwheni72yno81u2nqojwh01a21dc9d153142a77fec5fc31374",
            "0x25270d5ab846e5eiuweyrn9823nc9260ac76ca21dc9d153142a77fec5fc31843",
            "0x067oiqwoeiuq0982909m066aa843db60ac76ca21dc9d153142a77fec5fc57862",
        ];
        const seedsB = [
            "0x76270d98yo9c8374nc9238hf983y9n832nd98u3h98u98ur998NNRfec5fc31374",
            "0x2WEIU87yhn398yn9837yn98y3n938u4nc39nc9260ac76ca21dc9d1535fc31843",
            "0x067oiqwoeiuq0982909m066aa843db60ac76cakjehwn83u98398398jjnj57862",
        ];

        let list1 = await revealAll(seedsA);
        let list2 = await revealAll(seedsA);
        let list3 = await revealAll(seedsA);
        assert.deepEqual(list1, list2);
        assert.deepEqual(list2, list3);

        list1 = await revealAll(seedsB);
        assert.notDeepEqual(list1, list2);
        assert.notDeepEqual(list1, list3);

        list2 = await revealAll(seedsB);
        list3 = await revealAll(seedsB);
        assert.deepEqual(list1, list2);
        assert.deepEqual(list2, list3);
    });
})


async function revealAll(seeds:string[]): Promise<BeaconType[]> {
    //startes with all unknown
    let currentTokens = new Array(1500).fill(UNKNOWN) as BeaconType[];

   let seed = seeds[0]!;
    //add standards
    currentTokens = await mixBeacons(seed, currentTokens, 999, "Standard");
    
    //add Rare
    seed = seeds[1]!;
    currentTokens = await mixBeacons(seed, currentTokens, 301, "Rare");
    
    //add Mythic
    seed = seeds[2]!;
    currentTokens = await mixBeacons(seed, currentTokens, 125, "Mythic");
    
    //add Ultra
    return fillUnknown(currentTokens, "Ultra");
}