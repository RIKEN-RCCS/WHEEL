FROM pbspro/pbspro
EXPOSE 22

# install sshd package
RUN yum -y install openssh-server initscripts &&\
    /usr/sbin/sshd-keygen  &&\
    adduser pbsuser &&\
    echo "hoge" | passwd --stdin pbsuser &&\
    mkdir -p /home/pbsuser/.ssh &&\
    chown pbsuser:pbsuser  /home/pbsuser/.ssh

ADD ./entrypoint.sh /
CMD ["/usr/sbin/sshd", "-D"]
ENTRYPOINT ["bash", "entrypoint.sh"]
