/*
  Copyright 2018 Google LLC

  Use of this source code is governed by an MIT-style
  license that can be found in the LICENSE file or at
  https://opensource.org/licenses/MIT.
*/

import * as assert from 'assert';
import * as fse from 'fs-extra';
import * as glob from 'glob';
import {prompt, Separator} from 'inquirer';
import {oneLine as ol} from 'common-tags';

import {errors} from '../errors';
import {constants} from '../constants';

const ROOT_PROMPT = 'Please enter the path to the root of your web app:';

// The keys used for the questions/answers.
const question_rootDirectory = 'globDirectory';
const question_manualInput = 'manualDirectoryInput';

/**
 * @return {Promise<Array<string>>} The subdirectories of the current
 * working directory, with hidden and ignored ones filtered out.
 */
async function getSubdirectories(): Promise<Array<string>> {
  return await new Promise((resolve, reject) => {
    glob('*/', {
      ignore: constants.ignoredDirectories.map((directory) => `${directory}/`),
    }, (error, directories) => {
      if (error) {
        reject(error);
      } else {
        resolve(directories);
      }
    });
  });
}

/**
 * @return {Promise<Object>} The answers from inquirer.
 */
async function askQuestion(): Promise<{ globDirectory: string; manualDirectoryInput?: string }> {
  const subdirectories: (string | InstanceType<typeof Separator>)[] = await getSubdirectories();

  if (subdirectories.length > 0) {
    const manualEntryChoice = 'Manually enter path';
    return prompt([{
      name: question_rootDirectory,
      type: 'list',
      message: ol`What is the root of your web app (i.e. which directory do
        you deploy)?`,
      choices: subdirectories.concat([
        new Separator(),
        manualEntryChoice,
      ]),
    }, {
      name: question_manualInput,
      when: (answers: { globDirectory: string }) => answers.globDirectory === manualEntryChoice,
      message: ROOT_PROMPT,
    }
    ]);
  }

  return prompt([{
    name: question_rootDirectory,
    message: ROOT_PROMPT,
    default: '.',
  }]);
}

export async function askRootOfWebApp() {
  const { manualDirectoryInput, globDirectory } = await askQuestion();

  try {
    const stat = await fse.stat(manualDirectoryInput || globDirectory);
    assert(stat.isDirectory());
  } catch (error) {
    throw new Error(errors['glob-directory-invalid']);
  }

  return manualDirectoryInput || globDirectory;
}
