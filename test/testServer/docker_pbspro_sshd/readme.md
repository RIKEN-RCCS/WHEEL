# How to use
### 1. build image (1st time only)
```
> docker build --rm --no-cache -t pbspro-with-sshd .
```

### 2. run sshd in container
```
> docker run --rm -p4000:22 --name pbs -h pbs pbspro-with-sshd
```

### 3. access to container by ssh
```
> ssh pbsuser@localhost -p 4000 
```

you can submit any job  in the container

### 4. stop container
```
> docker kill pbs
```

## customize
### how to change pbsuser's password
replace "hoge" in Dockerfile's line 12  ```echo "hoge"|passwd --stdin pbsuser``` to desired password

### how to use public key authentication
send public key as follows after ```docker run```
```
> docker cp {your_public_key_file} pbs:/home/pbsuser/.ssh/authorized_keys
> docker exec pbs chown pbsuser:pbsuser /home/pbsuser/.ssh/authorized_keys
> docker exec pbs chmod 600  /home/pbsuser/.ssh/authorized_keys
```

### how to change port number
specify ```-p{portnumber}:22``` with docker run

### how to run without sshd
```
> docker run -it -rm --name pbs -h pbs pbspro-with-sshd bash
```

after bootup, you are logged in as root.

### how to change max number of queued job
change value of "o:PBS_ALL" (default 3) in entrypoint.sh

```
/opt/pbs/bin/qmgr -c 'set queue workq max_queued="[o:PBS_ALL=3]"'
                                                            ^^^
```
