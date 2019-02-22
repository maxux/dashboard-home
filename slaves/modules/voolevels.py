import requests
import re

class SignalLevel:
    def __init__(self, address, password):
        self.auth = requests.auth.HTTPBasicAuth('voo', password)
        self.url = 'http://%s/InstallationLevels.htm' % address

        self.uplabels = ['status', 'modulation', 'channel', 'symbolrate', 'frequency', 'txpower']
        self.uptype = [str, str, int, int, int, float]

        self.downlabels = ['status', 'modulation', 'channel', 'symbolrate', 'frequency', 'rxpower', 'snr']
        self.downtype = [str, str, int, int, int, float, float]

    # map a list of labels with values by index
    def mapper(self, keyf, values, types):
        # parsing value with correct type, and keeping first word, discarding units
        return dict((keyf(k), types[k](v.partition(' ')[0])) for k, v in enumerate(values))

    # return a list of channels with their mapped key name
    def streamer(self, channels, labels, types):
        stripped = []

        for channel in channels:
            stripped.append(self.mapper(lambda k: labels[k], channel, types))

        return stripped

    # split a voo-crappy-js-levels-line into a list of channels data
    def lister(self, line, fields):
        contents = line.split('|')
        channels = []
        index = 1

        for item in range(0, int(contents[0])):
            channels.append(contents[index:index + fields])
            index += fields

        return channels

    # fetch data and convert them to comprehensible dictionary
    def fetch(self):
        data = requests.get(self.url, auth=self.auth)
        if data.status_code != 200:
            return False

        rawds, rawus = re.findall(r"^\s+var tagValueList = '(.*)';$", data.text, re.MULTILINE)

        # upstream data rows contains 6 fields
        self.upstream = self.streamer(self.lister(rawus, 6), self.uplabels, self.uptype)

        # downstream data rows contains 7 fields
        self.downstream = self.streamer(self.lister(rawds, 7), self.downlabels, self.downtype)

        return True


if __name__ == '__main__':
    levels = SignalLevel('192.168.100.1', 'XXXXXX')
    if levels.fetch():
        print(levels.upstream)
        print(levels.downstream)
