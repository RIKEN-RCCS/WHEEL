FROM pbspro/pbspro
EXPOSE 22

# install sshd package
RUN yum -y install openssh-server initscripts

# generate hostkey
RUN /usr/sbin/sshd-keygen

# add non-root user and set password
RUN adduser pbsuser &&\
    echo "hoge" | passwd --stdin pbsuser

RUN mkdir -p /home/pbsuser/.ssh && chown pbsuser:pbsuser  /home/pbsuser/.ssh

ADD ./entrypoint.sh /
CMD ["/usr/sbin/sshd", "-D"]
ENTRYPOINT ["bash", "entrypoint.sh"]
