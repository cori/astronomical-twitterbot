#!/bin/bash

# install bash-it
if [ -d ~/.bash_it ]; then
	source ~/.bashrc
else 
	git clone --depth=1 https://github.com/Bash-it/bash-it.git ~/.bash_it
	/app/.bash_it/install.sh --silent
	source ~/.bashrc
	
	bash-it enable alias git
	bash-it enable completion git
	bash-it enable completion hub
	bash-it enable completion todo
	bash-it enable plugin todo
	bash-it enable plugin git
	bash-it enable plugin hub
fi

git config --global user.name "cori"
git config --global user.email "cori.schlegel@gmail.com"
git config user.name "cori"
git config user.email "cori.schlegel@gmail.com"
