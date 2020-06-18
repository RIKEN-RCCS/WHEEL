#!/bin/bash
# modify PBS config file
sed -i "s/PBS_SERVER=.*/PBS_SERVER=`hostname`/"     /etc/pbs.conf
sed -i "s/PBS_START_MOM=0/PBS_START_MOM=1/"         /etc/pbs.conf
sed -i "s/\$clienthost .*/\$clienthost `hostname`/" /var/spool/pbs/mom_priv/config

# start PBS servers
/etc/init.d/pbs start

# modify PBS settings
/opt/pbs/bin/qmgr -c "set server job_history_enable=True"
/opt/pbs/bin/qmgr -c 'set queue workq max_queued="[o:PBS_ALL=3]"'


#exec cmmand which is specified on docker run commandline
exec "$@"
