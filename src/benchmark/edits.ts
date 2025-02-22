import Benchmark = require('benchmark');
import fs = require("fs");
import { PieceTable } from '../piece-table';
import { RBTree } from '../rbTree';
import { LinesModel } from '../lines-model';
import { randomInt, randomStr } from '../util';
import { EdBuffer, EdBufferBuilder } from 'edcore';

const suite = new Benchmark.Suite('getLineContent', {
	onCycle: function (event) {
		console.log(String(event.target));
	}
});

const defaultOptions = {
	maxTime: 0,
	minSamples: 1
};

async function readFileAsync(input: string): Promise<EdBuffer> {
	return new Promise<EdBuffer>((resolve, reject) => {
		let fileName = `samples/${input}`;
		const stream = fs.createReadStream(fileName, { encoding: 'utf8' });
		let done = false;
		let builder = new EdBufferBuilder();

		stream.on('data', (chunk) => {
			builder.AcceptChunk(chunk);
		});

		stream.on('error', (error) => {
			if (!done) {
				done = true;
				reject();
			}
		});

		stream.on('end', () => {
			if (!done) {
				done = true;
				builder.Finish();
				resolve(builder.Build());
			}
		});
	});
}

readFileAsync('empty.ts').then((edBuffer) => {
	let str = 'a';
	var pt = new PieceTable('a');
	var prRb = new RBTree('a');
	let ptOperations = [];
	for (let i = 0; i < 10000; i++) {
		if (Math.random() < 2) {
			// insert
			let text = randomStr(100);
			let pos = randomInt(str.length + 1);
			ptOperations.push({
				insert: true,
				text: text,
				pos: pos
			});
			// pt.insert(text, pos);
			// edBuffer.ReplaceOffsetLen([{offset: pos, length: 0, text: text}]);
			str = str.substring(0, pos) + text + str.substring(pos);
		} else {
			// delete
			let pos = randomInt(str.length);
			let length = Math.min(str.length - pos, Math.floor(Math.random() * 10))
			let deletedText = str.substr(pos, length);
			// pt.delete(pos, length);
			ptOperations.push({
				insert: false,
				length: length,
				pos: pos
			});
			// edBuffer.ReplaceOffsetLen([{offset: pos, length: length, text: ''}]);
			str = str.substring(0, pos) + str.substring(pos + length);
		}
	}

	suite.add(Object.assign({},
		{
			name: "pt push edits",
			fn() {
				ptOperations.forEach(edit => {
					if (edit.insert) {
						pt.insert(edit.text, edit.pos);
					} else {
						pt.delete(edit.pos, edit.length);
					}
					
				});
			}
		}
		, defaultOptions));
		
	suite.add(Object.assign({},
		{
			name: "pt-rb push edits",
			fn() {
				ptOperations.forEach(edit => {
					if (edit.insert) {
						prRb.insert(edit.text, edit.pos);
					} else {
						prRb.delete(edit.pos, edit.length);
					}
				});
			}
		}
		, defaultOptions));

	suite.add(Object.assign({},
		{
			name: "edcore push edits",
			fn() {
				ptOperations.forEach(edit => {
					if (edit.insert) {
						edBuffer.ReplaceOffsetLen([{ offset: edit.pos, length: 0, text: edit.text }]);
					} else {
						edBuffer.ReplaceOffsetLen([{ offset: edit.pos, length: edit.length, text: '' }]);
					}
				});
			}
		}
		, defaultOptions));
	suite.run();
});

