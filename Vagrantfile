Vagrant.configure("2") do |config|
    config.vm.box = "ubuntu/jammy64"
    config.vm.synced_folder ".", "/vagrant"

    config.vm.provision "shell", path: "provision/common.sh"

    # This one is for the DB VM
    config.vm.define "db-vm" do |db|
        db.vm.hostname = "db.local"
        db.vm.network "private_network", ip: "192.168.56.10"
        db.vm.provider "virtualbox" do |vb|
            vb.name = "cosc-349-db"
            vb.memory = 1024
            vb.cpus = 1
        end
        db.vm.provision "shell", path: "provision/db.sh"
    end

    # This one is for the API VM
    config.vm.define "api-vm" do |api|
        api.vm.hostname = "api.local"
        api.vm.network "private_network", ip: "192.168.56.11"
        api.vm.provider "virtualbox" do |vb|
            vb.name = "cosc349-api"
            vb.memory = 1024
            vb.cpus = 1
        end
        api.vm.provision "shell", path: "provision/api.sh", args: [
            "192.168.56.10",
            "finance_db",
            "finance_user",
            "finance_pass"
        ]
    end
    # This is the web VM
    config.vm.define "web-vm" do |web|
        web.vm.hostname = "web.local"
        web.vm.network "private_network", ip: "192.168.56.12"

        web.vm.network  "forwarded_port", guest: 80, host: 8080, auto_correct: true 
        
        web.vm.provider "virtualbox" do |vb|
            vb.name = "cosc349-web"
            vb.memory = 512
            vb.cpus = 1
        end
        web.vm.provision "shell", path: "provision/web.sh", args: [
            "192.168.56.11"
        ]
    end
end

        
