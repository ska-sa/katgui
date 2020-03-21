## KATGUI is the operator's User Interface for CAM in the MeerKAT project.

After cloning the repo do:

- Download and install http://nodejs.org/
- Download and install http://yarnpkg.com/
- Install gulp: `yarn global add gulp`

Ensure that `gulp` is in your path. e.g.`~/.yarn/bin/gulp`


You could be lucky by trying the following:
```bash
sudo apt-get install curl
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
```

```bash
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt-get update && sudo apt-get install yarn
```

Navigate to the project folder:

`yarn install`

To use gulp to host the project locally on port 8000 do:

`gulp webserver`

Note: that running the webserver task will open a browser window to: `http://localhost:8000/localhostindex.html`.

The `localhostindex.html` file is created from the `index.html` file by the webserver task.
This is necessary in order to change the `<base href="/katgui/">` to `<base href="/">` for locally hosted instances of the GUI.
This allows us to run angularjs in 'HTML5' mode, which removes the hash from the URL. This means that when the `index.html` file is changed, the gulp webserver task needs to be stopped and started again to rebuild the `localhostindex.html` file.

To build the production version do:

`gulp build`

Which will minify and concat to the dist/ folder.

After the production version has been built, make sure to commit and the new version to GitHub. This effectively creates a new release that is 'deployed' when pulling the KATGUI  project on the target CAM portal node.

### Debugging

For debugging purposes run KATGUI in a docker container.
Ensure docker is installed else follow this [guide](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-16-04)

```bash
docker build -t "$USER/$(basename $PWD)" .
docker run -ti --rm -p 8000:8000 "$USER/$(basename $PWD)"
```

Access the KATGUI: [http://localhost:8000/localhostindex.html](http://localhost:8000/localhostindex.html)

You should see the development KATGUI, enter your development box URL, username and password.

![image](https://user-images.githubusercontent.com/7910856/76946015-0f926d80-690c-11ea-8ee8-f977668712d2.png)
