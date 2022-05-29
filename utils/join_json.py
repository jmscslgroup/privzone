#!/usr/bin/env python

# Initial Date: October 2021
# Author: Rahul Bhadani
# Copyright (c)  Rahul Bhadani
# All rights reserved.

__author__ = 'Rahul Bhadani'
__email__  = 'rahulbhadani@email.arizona.edu'

import json
import ntpath

class join:
    json1 = None
    json2 = None
    def __init__(self, file1, file2) -> None:
        """
        Joins two json file
        """
        if file1[-4:] != 'json':
            print('Please supply the first file with .json file extension.')
            return

        if file2[-4:] != 'json':
            print('Please supply the second file with .json file extension.')
            return
        
        with open(file1, 'r') as handle:
            try:
                self.json1 = json.load(handle)
            except ValueError as err:
                print("Incorrect json file 1 format.")
                return False
            
        with open(file2, 'r') as handle:
            try:
                self.json2 = json.load(handle)
            except ValueError as err:
                print("Incorrect json file 2 format.")
                return False
        
        print(self.json1)
        if self.json1['vin'] == self.json2['vin']:
            self.json1['regions'] = self.json1['regions']  + self.json2['regions']

        newfile =   ntpath.dirname(file1) + '/' + ntpath.basename(file1)[0:-5] + '_' + ntpath.basename(file2)

        with open(newfile, "w") as write_file:
            json.dump(self.json1, write_file, indent=4)

        