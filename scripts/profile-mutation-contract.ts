import assert from 'node:assert/strict';
import { INITIAL_PROFILES } from '../src/data/mockData';
import { addBlock, duplicateBlock, reorderBlocks, removeTab } from '../src/services/profileMutationService';
import { duplicateProfile } from '../src/services/profileFactoryService';

const source = structuredClone(INITIAL_PROFILES[0]);
const tabId = source.tabs[0].id;
const blockId = source.tabs[0].blocks[0].id;

const withBlock = addBlock(source, tabId, 'link');
assert.equal(withBlock.tabs[0].blocks.length, source.tabs[0].blocks.length + 1, 'addBlock should append one block');
assert.equal(source.tabs[0].blocks.length, INITIAL_PROFILES[0].tabs[0].blocks.length, 'mutations must not mutate the source profile');

const duplicated = duplicateBlock(withBlock, tabId, blockId);
assert.equal(duplicated.tabs[0].blocks.length, withBlock.tabs[0].blocks.length + 1, 'duplicateBlock should insert one block');
assert.notEqual(duplicated.tabs[0].blocks[0].id, duplicated.tabs[0].blocks[1].id, 'duplicated blocks need unique IDs');

const reordered = reorderBlocks(duplicated, tabId, 0, duplicated.tabs[0].blocks.length - 1);
assert.deepEqual(reordered.tabs[0].blocks.map(block => block.position), reordered.tabs[0].blocks.map((_, index) => index), 'reorderBlock should reindex positions');

const copy = duplicateProfile(source);
assert.notEqual(copy.id, source.id, 'duplicated profiles need unique IDs');
assert.notEqual(copy.tabs[0].id, source.tabs[0].id, 'duplicated tabs need unique IDs');
assert.notEqual(copy.tabs[0].blocks[0].id, source.tabs[0].blocks[0].id, 'duplicated blocks need unique IDs');
assert.equal(copy.customDomain, undefined, 'duplicated profiles must not carry custom domains');
assert.equal(copy.tabs[0].blocks[0].clicks, 0, 'duplicated blocks must reset engagement counters');

const singleTabProfile = removeTab(source, tabId);
assert.equal(singleTabProfile.tabs.length, 1, 'a profile must retain its only tab');

console.log('profile-mutation-contract: all assertions passed');
